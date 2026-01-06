import Peer, { DataConnection, PeerOptions } from "peerjs";
import { generateRoomCode, roomCodeToPeerId, invalidateRoom } from "./room-code";
import {
  SyncMessage,
  SyncMessageType,
  createHelloMessage,
  createSyncRequestMessage,
  createSyncDataMessage,
  createAckMessage,
  createErrorMessage,
  deserializeSyncData,
  isValidMessage,
} from "./sync-protocol";
import { localDB, getDeviceId } from "@/lib/db";

// ICE servers for NAT traversal (needed for cross-network connections)
// STUN servers help discover public IP, TURN servers relay when direct P2P fails
const ICE_SERVERS: RTCIceServer[] = [
  // Google STUN servers (free, reliable)
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Open Relay Project - free TURN servers (community-provided, no SLA)
  // These significantly improve connection success behind symmetric NATs/firewalls
  {
    urls: "stun:openrelay.metered.ca:80",
  },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const PEER_OPTIONS: PeerOptions = {
  config: {
    iceServers: ICE_SERVERS,
  },
  debug: process.env.NODE_ENV === "development" ? 2 : 0,
};

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "waiting"
  | "connected"
  | "syncing"
  | "error";

export interface SyncProgress {
  current: number;
  total: number;
  phase: "sending" | "receiving" | "merging";
}

export interface PeerManagerCallbacks {
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: string) => void;
  onSyncStart?: () => void;
  onSyncProgress?: (progress: SyncProgress) => void;
  onSyncComplete?: () => void;
  onPeerConnected?: (peerId: string) => void;
  onPeerDisconnected?: () => void;
}

export class P2PPeerManager {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private roomCode: string | null = null;
  private isHost: boolean = false;
  private callbacks: PeerManagerCallbacks = {};
  private state: ConnectionState = "disconnected";
  private deviceId: string = "";
  private hasReceivedHello: boolean = false; // Prevent duplicate sync initiation

  constructor(callbacks?: PeerManagerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  /**
   * Update callbacks without creating a new instance (preserves connection)
   */
  updateCallbacks(callbacks: PeerManagerCallbacks) {
    this.callbacks = callbacks;
  }

  private setState(state: ConnectionState) {
    console.log(`[P2P] State change: ${this.state} -> ${state} (isHost: ${this.isHost})`);
    this.state = state;
    this.callbacks.onStateChange?.(state);
  }

  getState(): ConnectionState {
    return this.state;
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }

  isConnected(): boolean {
    return this.state === "connected" || this.state === "syncing";
  }

  /**
   * Create a new room as host
   */
  async createRoom(): Promise<string> {
    console.log("[P2P] createRoom called");
    this.deviceId = await getDeviceId();
    this.roomCode = generateRoomCode();
    this.isHost = true;
    this.hasReceivedHello = false; // Reset for new room
    console.log(`[P2P] Room created with code: ${this.roomCode}, deviceId: ${this.deviceId}`);

    return new Promise((resolve, reject) => {
      this.setState("connecting");

      const peerId = roomCodeToPeerId(this.roomCode!, "host");
      console.log(`[P2P] Creating peer with ID: ${peerId}`);
      this.peer = new Peer(peerId, PEER_OPTIONS);

      this.peer.on("open", () => {
        console.log("[P2P] Peer opened, waiting for connections...");
        this.setState("waiting");
        resolve(this.roomCode!);
      });

      this.peer.on("connection", (conn) => {
        console.log("[P2P] Incoming connection received from:", conn.peer);
        this.handleIncomingConnection(conn);
      });

      this.peer.on("error", (err) => {
        this.setState("error");
        this.callbacks.onError?.(err.message);
        reject(err);
      });

      this.peer.on("disconnected", () => {
        this.setState("disconnected");
        this.callbacks.onPeerDisconnected?.();
      });
    });
  }

  /**
   * Join an existing room as client
   */
  async joinRoom(roomCode: string): Promise<void> {
    console.log(`[P2P] joinRoom called with code: ${roomCode}`);
    this.deviceId = await getDeviceId();
    this.roomCode = roomCode;
    this.isHost = false;
    this.hasReceivedHello = false; // Reset for new connection
    console.log(`[P2P] Joining room, deviceId: ${this.deviceId}`);

    return new Promise((resolve, reject) => {
      this.setState("connecting");

      // Client creates peer with unique ID
      const clientPeerId = roomCodeToPeerId(roomCode, "client") + "-" + Date.now();
      console.log(`[P2P] Creating client peer with ID: ${clientPeerId}`);
      this.peer = new Peer(clientPeerId, PEER_OPTIONS);

      this.peer.on("open", () => {
        // Connect to host
        const hostPeerId = roomCodeToPeerId(roomCode, "host");
        console.log(`[P2P] Client peer opened, connecting to host: ${hostPeerId}`);
        const conn = this.peer!.connect(hostPeerId, {
          reliable: true,
        });

        conn.on("open", () => {
          console.log("[P2P] Connection to host opened");
          this.connection = conn;
          this.setupConnectionHandlers(conn);
          this.setState("connected");
          this.callbacks.onPeerConnected?.(conn.peer);

          // Start sync as client
          console.log("[P2P] Starting sync as client...");
          this.initiateSync();
          resolve();
        });

        conn.on("error", (err) => {
          this.setState("error");
          this.callbacks.onError?.(err.message);
          reject(err);
        });
      });

      this.peer.on("error", (err) => {
        this.setState("error");
        this.callbacks.onError?.(err.message);
        reject(err);
      });
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    console.log("[P2P] handleIncomingConnection, setting up connection handlers...");
    this.connection = conn;
    this.hasReceivedHello = false; // Reset for new connection
    this.setupConnectionHandlers(conn);

    conn.on("open", () => {
      console.log("[P2P] Incoming connection opened");
      // Single-use: invalidate room code once connected
      if (this.roomCode) {
        console.log("[P2P] Invalidating room code:", this.roomCode);
        invalidateRoom(this.roomCode);
      }
      this.setState("connected");
      this.callbacks.onPeerConnected?.(conn.peer);

      // Host does NOT initiate sync - waits for client's HELLO
      // This prevents race conditions where both sides send HELLO simultaneously
      console.log("[P2P] Host waiting for client HELLO to start sync...");
    });
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on("data", (data) => {
      // Validate message structure before handling
      if (!isValidMessage(data)) {
        console.warn("[P2P] Received invalid message:", data);
        this.send(createErrorMessage("INVALID_MESSAGE", "Received malformed message"));
        return;
      }
      this.handleMessage(data);
    });

    conn.on("close", () => {
      this.connection = null;
      this.setState("disconnected");
      this.callbacks.onPeerDisconnected?.();
    });

    conn.on("error", (err) => {
      this.callbacks.onError?.(err.message);
    });
  }

  private async handleMessage(message: SyncMessage) {
    console.log(`[P2P] Received message: ${message.type} (isHost: ${this.isHost})`, message.payload);

    switch (message.type) {
      case SyncMessageType.HELLO:
        console.log(`[P2P] HELLO received, hasReceivedHello: ${this.hasReceivedHello}`);
        // Prevent duplicate HELLO handling (race condition protection)
        if (this.hasReceivedHello) {
          console.log("[P2P] Ignoring duplicate HELLO");
          return;
        }
        this.hasReceivedHello = true;

        // Respond with our own hello
        console.log("[P2P] Sending HELLO response...");
        await this.sendHello();

        // Only the peer that RECEIVED the first HELLO sends SYNC_REQUEST
        // This ensures only one side initiates the data exchange
        const syncState = await localDB.getSyncState();
        const since = syncState?.lastSyncTimestamp || new Date(0);
        console.log(`[P2P] Sending SYNC_REQUEST with since: ${since.toISOString()}`);
        this.send(createSyncRequestMessage(since));
        break;

      case SyncMessageType.SYNC_REQUEST:
        console.log(`[P2P] SYNC_REQUEST received, fetching changes since: ${message.payload.since}`);
        // Send our changes since requested timestamp
        const changes = await localDB.getChangedSince(new Date(message.payload.since));

        // Calculate total items to send
        const sendTotalItems =
          (changes.transactions?.length || 0) +
          (changes.categories?.length || 0) +
          (changes.budgets?.length || 0) +
          (changes.rules?.length || 0);

        console.log(`[P2P] Sending ${sendTotalItems} items (tx: ${changes.transactions?.length || 0}, cat: ${changes.categories?.length || 0}, budget: ${changes.budgets?.length || 0}, rules: ${changes.rules?.length || 0})`);

        // Report sending progress
        this.callbacks.onSyncProgress?.({
          current: 0,
          total: sendTotalItems,
          phase: "sending",
        });

        this.send(createSyncDataMessage(changes));

        // Report send complete
        this.callbacks.onSyncProgress?.({
          current: sendTotalItems,
          total: sendTotalItems,
          phase: "sending",
        });
        console.log("[P2P] SYNC_DATA sent, waiting for ACK...");
        break;

      case SyncMessageType.SYNC_DATA:
        console.log("[P2P] SYNC_DATA received, starting merge...");
        // Merge incoming changes
        this.setState("syncing");
        this.callbacks.onSyncStart?.();

        // Deserialize dates (JSON transmission converts Date objects to strings)
        const deserializedData = deserializeSyncData(message.payload.data);

        // Calculate total items to merge
        const totalItems =
          (deserializedData.transactions?.length || 0) +
          (deserializedData.categories?.length || 0) +
          (deserializedData.budgets?.length || 0) +
          (deserializedData.rules?.length || 0);

        console.log(`[P2P] Received ${totalItems} items to merge (tx: ${deserializedData.transactions?.length || 0}, cat: ${deserializedData.categories?.length || 0}, budget: ${deserializedData.budgets?.length || 0}, rules: ${deserializedData.rules?.length || 0})`);

        // Report receiving progress
        this.callbacks.onSyncProgress?.({
          current: 0,
          total: totalItems,
          phase: "receiving",
        });

        // Report merging progress
        this.callbacks.onSyncProgress?.({
          current: 0,
          total: totalItems,
          phase: "merging",
        });

        try {
          console.log("[P2P] Merging changes into local DB...");
          await localDB.mergeChanges(deserializedData);

          // Report completion
          this.callbacks.onSyncProgress?.({
            current: totalItems,
            total: totalItems,
            phase: "merging",
          });

          // Only update timestamp AFTER successful merge
          await localDB.updateSyncState({
            lastSyncTimestamp: new Date(),
          });

          // Acknowledge success
          console.log("[P2P] Merge complete, sending ACK...");
          this.send(createAckMessage(totalItems));
          this.setState("connected");
          console.log("[P2P] Calling onSyncComplete callback...");
          this.callbacks.onSyncComplete?.();
        } catch (error) {
          console.error("[P2P] Merge failed:", error);
          this.send(createErrorMessage("MERGE_FAILED", "Failed to merge data"));
          this.setState("error");
          this.callbacks.onError?.("Failed to merge incoming data");
        }
        break;

      case SyncMessageType.ACK:
        console.log(`[P2P] ACK received, receivedCount: ${message.payload.receivedCount}`);
        // Sync acknowledged by peer
        await localDB.updateSyncState({
          lastSyncTimestamp: new Date(),
        });
        this.setState("connected");
        console.log("[P2P] Calling onSyncComplete callback (ACK received)...");
        this.callbacks.onSyncComplete?.();
        break;

      case SyncMessageType.ERROR:
        // Handle error from peer
        console.error("[P2P] Peer error:", message.payload.code, message.payload.message);
        this.setState("error");
        this.callbacks.onError?.(message.payload.message);
        break;
    }
  }

  private async sendHello() {
    this.send(createHelloMessage(this.deviceId));
  }

  private send(message: SyncMessage) {
    if (this.connection && this.connection.open) {
      console.log(`[P2P] Sending message: ${message.type}`, message.payload);
      this.connection.send(message);
    } else {
      console.warn(`[P2P] Cannot send message, connection not open:`, message.type);
    }
  }

  /**
   * Initiate sync (called by client after connecting)
   */
  async initiateSync() {
    console.log("[P2P] initiateSync called, connection:", !!this.connection);
    if (!this.connection) return;

    this.setState("syncing");
    this.callbacks.onSyncStart?.();
    console.log("[P2P] Sync started, calling onSyncStart callback...");

    // Send hello to start sync
    console.log("[P2P] Sending initial HELLO to start sync...");
    await this.sendHello();
  }

  /**
   * Manually trigger sync
   */
  async sync() {
    if (!this.isConnected()) {
      throw new Error("Not connected");
    }

    this.callbacks.onSyncStart?.();
    this.setState("syncing");

    // Request full sync
    this.send(createSyncRequestMessage(new Date(0)));
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.roomCode = null;
    this.hasReceivedHello = false; // Reset state for next connection
    this.setState("disconnected");
  }
}

// Singleton instance
let peerManagerInstance: P2PPeerManager | null = null;

export function getPeerManager(callbacks?: PeerManagerCallbacks): P2PPeerManager {
  if (!peerManagerInstance) {
    peerManagerInstance = new P2PPeerManager(callbacks);
  } else if (callbacks) {
    // Update callbacks on existing instance (preserves connection)
    peerManagerInstance.updateCallbacks(callbacks);
  }
  return peerManagerInstance;
}

/**
 * Reset the singleton instance (useful for testing or cleanup)
 */
export function resetPeerManager() {
  if (peerManagerInstance) {
    peerManagerInstance.disconnect();
    peerManagerInstance = null;
  }
}

import Peer, { DataConnection, PeerOptions } from "peerjs";
import { generateRoomCode, roomCodeToPeerId, invalidateRoom } from "./room-code";
import {
  SyncMessage,
  SyncMessageType,
  createHelloMessage,
  createSyncRequestMessage,
  createSyncDataMessage,
  createAckMessage,
} from "./sync-protocol";
import { localDB, getDeviceId } from "@/lib/db/local-db";

// ICE servers for NAT traversal (needed for cross-network connections)
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
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

export interface PeerManagerCallbacks {
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: string) => void;
  onSyncStart?: () => void;
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

  constructor(callbacks?: PeerManagerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  private setState(state: ConnectionState) {
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
    this.deviceId = await getDeviceId();
    this.roomCode = generateRoomCode();
    this.isHost = true;

    return new Promise((resolve, reject) => {
      this.setState("connecting");

      const peerId = roomCodeToPeerId(this.roomCode!, "host");
      this.peer = new Peer(peerId, PEER_OPTIONS);

      this.peer.on("open", () => {
        this.setState("waiting");
        resolve(this.roomCode!);
      });

      this.peer.on("connection", (conn) => {
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
    this.deviceId = await getDeviceId();
    this.roomCode = roomCode;
    this.isHost = false;

    return new Promise((resolve, reject) => {
      this.setState("connecting");

      // Client creates peer with unique ID
      const clientPeerId = roomCodeToPeerId(roomCode, "client") + "-" + Date.now();
      this.peer = new Peer(clientPeerId, PEER_OPTIONS);

      this.peer.on("open", () => {
        // Connect to host
        const hostPeerId = roomCodeToPeerId(roomCode, "host");
        const conn = this.peer!.connect(hostPeerId, {
          reliable: true,
        });

        conn.on("open", () => {
          this.connection = conn;
          this.setupConnectionHandlers(conn);
          this.setState("connected");
          this.callbacks.onPeerConnected?.(conn.peer);

          // Start sync as client
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
    this.connection = conn;
    this.setupConnectionHandlers(conn);

    conn.on("open", () => {
      // Single-use: invalidate room code once connected
      if (this.roomCode) {
        invalidateRoom(this.roomCode);
      }
      this.setState("connected");
      this.callbacks.onPeerConnected?.(conn.peer);

      // Auto-sync when connection established (host side)
      this.initiateSync();
    });
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on("data", (data) => {
      this.handleMessage(data as SyncMessage);
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
    switch (message.type) {
      case SyncMessageType.HELLO:
        // Respond with our own hello
        await this.sendHello();
        // Request their changes since our last sync
        const syncState = await localDB.getSyncState();
        const since = syncState?.lastSyncTimestamp || new Date(0);
        this.send(createSyncRequestMessage(since));
        break;

      case SyncMessageType.SYNC_REQUEST:
        // Send our changes since requested timestamp
        const changes = await localDB.getChangedSince(new Date(message.payload.since));
        this.send(createSyncDataMessage(changes));
        break;

      case SyncMessageType.SYNC_DATA:
        // Merge incoming changes
        this.setState("syncing");
        this.callbacks.onSyncStart?.();

        await localDB.mergeChanges(message.payload.data);
        await localDB.updateSyncState({
          lastSyncTimestamp: new Date(),
        });

        // Acknowledge
        this.send(createAckMessage());
        this.setState("connected");
        this.callbacks.onSyncComplete?.();
        break;

      case SyncMessageType.ACK:
        // Sync acknowledged
        await localDB.updateSyncState({
          lastSyncTimestamp: new Date(),
        });
        this.setState("connected");
        this.callbacks.onSyncComplete?.();
        break;
    }
  }

  private async sendHello() {
    this.send(createHelloMessage(this.deviceId));
  }

  private send(message: SyncMessage) {
    if (this.connection && this.connection.open) {
      this.connection.send(message);
    }
  }

  /**
   * Initiate sync (called by client after connecting)
   */
  async initiateSync() {
    if (!this.connection) return;

    this.setState("syncing");
    this.callbacks.onSyncStart?.();

    // Send hello to start sync
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
    this.setState("disconnected");
  }
}

// Singleton instance
let peerManagerInstance: P2PPeerManager | null = null;

export function getPeerManager(callbacks?: PeerManagerCallbacks): P2PPeerManager {
  if (!peerManagerInstance) {
    peerManagerInstance = new P2PPeerManager(callbacks);
  } else if (callbacks) {
    // Update callbacks
    peerManagerInstance = new P2PPeerManager(callbacks);
  }
  return peerManagerInstance;
}

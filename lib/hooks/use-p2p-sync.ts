"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  P2PPeerManager,
  ConnectionState,
  SyncProgress,
  getPeerManager,
} from "@/lib/p2p/peer-manager";
import { initializeLocalDB, localDB } from "@/lib/db";

export interface UseP2PSyncReturn {
  // State
  state: ConnectionState;
  roomCode: string | null;
  isHost: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  syncProgress: SyncProgress | null;

  // Actions
  createRoom: () => Promise<string>;
  joinRoom: (code: string) => Promise<void>;
  disconnect: () => void;
  sync: () => Promise<void>;

  // Helpers
  isConnected: boolean;
  isSyncing: boolean;
}

export function useP2PSync(): UseP2PSyncReturn {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const managerRef = useRef<P2PPeerManager | null>(null);
  const initializedRef = useRef(false);

  // Initialize local database on mount
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeLocalDB().then(() => {
        // Load last sync time from local DB
        localDB.getSyncState().then((syncState) => {
          if (syncState?.lastSyncTimestamp) {
            setLastSyncTime(syncState.lastSyncTimestamp);
          }
        });
      });
    }
  }, []);

  // Create or get peer manager with callbacks
  const getManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = getPeerManager({
        onStateChange: (newState) => {
          setState(newState);
          // Clear progress when not syncing
          if (newState !== "syncing") {
            setSyncProgress(null);
          }
        },
        onError: (err) => {
          setError(err);
        },
        onSyncStart: () => {
          setError(null);
          setSyncProgress({ current: 0, total: 0, phase: "receiving" });
        },
        onSyncProgress: (progress) => {
          setSyncProgress(progress);
        },
        onSyncComplete: () => {
          setLastSyncTime(new Date());
          setSyncProgress(null);
        },
        onPeerConnected: () => {
          setError(null);
        },
        onPeerDisconnected: () => {
          // Optionally clear room code on disconnect
        },
      });
    }
    return managerRef.current;
  }, []);

  // Create a new room
  const createRoom = useCallback(async (): Promise<string> => {
    const manager = getManager();
    setError(null);
    setIsHost(true);

    const code = await manager.createRoom();
    setRoomCode(code);

    // Save room code to local DB
    await localDB.updateSyncState({ roomCode: code });

    return code;
  }, [getManager]);

  // Join an existing room
  const joinRoom = useCallback(
    async (code: string): Promise<void> => {
      const manager = getManager();
      setError(null);
      setIsHost(false);

      await manager.joinRoom(code);
      setRoomCode(code);

      // Save room code to local DB
      await localDB.updateSyncState({ roomCode: code });
    },
    [getManager]
  );

  // Disconnect
  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
    }
    setRoomCode(null);
    setIsHost(false);
  }, []);

  // Manual sync
  const sync = useCallback(async () => {
    const manager = getManager();
    if (manager.isConnected()) {
      await manager.sync();
    }
  }, [getManager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
      }
    };
  }, []);

  return {
    state,
    roomCode,
    isHost,
    error,
    lastSyncTime,
    syncProgress,
    createRoom,
    joinRoom,
    disconnect,
    sync,
    isConnected: state === "connected" || state === "syncing",
    isSyncing: state === "syncing",
  };
}

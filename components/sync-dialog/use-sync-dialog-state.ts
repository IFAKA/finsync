"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useP2PSync } from "@/lib/hooks/use-p2p-sync";
import {
  isValidRoomCode,
  normalizeRoomCode,
  getRoomExpirySeconds,
} from "@/lib/p2p/room-code";

export type DialogMode = "choose" | "create" | "join" | "connected" | "syncing" | "success";

interface UseSyncDialogStateOptions {
  open: boolean;
  initialMode?: DialogMode;
  onOpenChange: (open: boolean) => void;
  onSyncComplete?: () => void;
}

export function useSyncDialogState({
  open,
  initialMode = "choose",
  onOpenChange,
  onSyncComplete,
}: UseSyncDialogStateOptions) {
  const [mode, setMode] = useState<DialogMode>(initialMode);
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [expirySeconds, setExpirySeconds] = useState(0);
  const [hasStartedSync, setHasStartedSync] = useState(false);
  const [hasCompletedSync, setHasCompletedSync] = useState(false);

  const {
    state,
    roomCode,
    error,
    syncProgress,
    createRoom,
    joinRoom,
    disconnect,
    isConnected,
    isSyncing,
  } = useP2PSync();

  // Reset to initialMode when dialog opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  // Auto-transition to connected mode when first connected (before sync starts)
  useEffect(() => {
    if (isConnected && !isSyncing && mode !== "connected" && mode !== "syncing" && mode !== "success") {
      setMode("connected");
    }
  }, [isConnected, isSyncing, mode]);

  // Auto-transition to syncing mode when sync actually starts
  useEffect(() => {
    if (isSyncing && (mode === "connected" || mode === "create" || mode === "join")) {
      setMode("syncing");
      setHasStartedSync(true);
    }
  }, [isSyncing, mode]);

  // Auto-transition to success and close when sync completes
  useEffect(() => {
    if (isConnected && !isSyncing && hasStartedSync && mode === "syncing" && !hasCompletedSync) {
      setHasCompletedSync(true);
      setMode("success");

      onSyncComplete?.();

      // Auto-close after 2.5 seconds
      const timer = setTimeout(() => {
        disconnect();
        onOpenChange(false);
        setMode(initialMode);
        setHasStartedSync(false);
        setHasCompletedSync(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isConnected, isSyncing, hasStartedSync, mode, hasCompletedSync, disconnect, onOpenChange, onSyncComplete, initialMode]);

  // Expiry countdown timer
  useEffect(() => {
    if (mode === "create" && roomCode) {
      const updateExpiry = () => {
        const seconds = getRoomExpirySeconds(roomCode);
        setExpirySeconds(seconds);
        if (seconds <= 0 && !isConnected) {
          disconnect();
          setMode("choose");
          toast.error("Room expired. Please create a new one.");
        }
      };

      updateExpiry();
      const interval = setInterval(updateExpiry, 1000);
      return () => clearInterval(interval);
    }
  }, [mode, roomCode, isConnected, disconnect]);

  const handleCreateRoom = useCallback(async () => {
    setMode("create");
    try {
      await createRoom();
    } catch {
      toast.error("Failed to create room");
      setMode("choose");
    }
  }, [createRoom]);

  const handleJoinRoom = useCallback(async () => {
    const normalized = normalizeRoomCode(inputCode);

    if (!isValidRoomCode(normalized)) {
      setJoinError("Invalid format. Example: BLUE-TIGER-FAST-STORM-A7K2");
      return;
    }

    setJoinError(null);

    try {
      await joinRoom(normalized);
      toast.success("Connected!");
    } catch {
      setJoinError("Failed to connect. Check the code and try again.");
    }
  }, [inputCode, joinRoom]);

  const handleCopyCode = useCallback(async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied!");
  }, [roomCode]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setMode("choose");
    setInputCode("");
    toast.info("Disconnected");
  }, [disconnect]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setMode(initialMode);
      setInputCode("");
      setJoinError(null);
      setHasStartedSync(false);
      setHasCompletedSync(false);
    }
    onOpenChange(newOpen);
  }, [initialMode, onOpenChange]);

  const handleInputCodeChange = useCallback((value: string) => {
    setInputCode(value.toUpperCase());
    setJoinError(null);
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    // State
    mode,
    setMode,
    inputCode,
    copied,
    joinError,
    expirySeconds,
    // P2P state
    state,
    roomCode,
    error,
    isConnected,
    syncProgress,
    // Handlers
    handleCreateRoom,
    handleJoinRoom,
    handleCopyCode,
    handleDisconnect,
    handleOpenChange,
    handleInputCodeChange,
    formatTime,
  };
}

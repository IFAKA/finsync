"use client";

import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getRoomShareUrl } from "@/lib/p2p/room-code";
import {
  useSyncDialogState,
  SyncChooseMode,
  SyncCreateMode,
  SyncJoinMode,
  SyncSyncingMode,
  SyncSuccessMode,
  type DialogMode,
} from "./sync-dialog/index";

interface SyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: DialogMode;
  onSyncComplete?: () => void;
}

export function SyncDialog({
  open,
  onOpenChange,
  initialMode = "choose",
  onSyncComplete,
}: SyncDialogProps) {
  const {
    mode,
    setMode,
    inputCode,
    copied,
    joinError,
    expirySeconds,
    state,
    roomCode,
    error,
    handleCreateRoom,
    handleJoinRoom,
    handleCopyCode,
    handleDisconnect,
    handleOpenChange,
    handleInputCodeChange,
    formatTime,
  } = useSyncDialogState({
    open,
    initialMode,
    onOpenChange,
    onSyncComplete,
  });

  const handleShare = async () => {
    if (!roomCode) return;
    const url = getRoomShareUrl(roomCode);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sync with me",
          text: `Join my sync room: ${roomCode}`,
          url,
        });
      } catch {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {mode === "choose" && (
            <SyncChooseMode
              onCreateRoom={handleCreateRoom}
              onJoinRoom={() => setMode("join")}
            />
          )}

          {mode === "create" && (
            <SyncCreateMode
              roomCode={roomCode}
              state={state}
              expirySeconds={expirySeconds}
              copied={copied}
              onCopyCode={handleCopyCode}
              onShare={handleShare}
              onBack={() => setMode("choose")}
              onCancel={handleDisconnect}
              formatTime={formatTime}
            />
          )}

          {mode === "join" && (
            <SyncJoinMode
              inputCode={inputCode}
              state={state}
              joinError={joinError}
              error={error}
              onInputChange={handleInputCodeChange}
              onJoin={handleJoinRoom}
              onBack={() => setMode("choose")}
            />
          )}

          {mode === "syncing" && <SyncSyncingMode roomCode={roomCode} />}

          {mode === "success" && <SyncSuccessMode roomCode={roomCode} />}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SyncDialog } from "@/components/sync-dialog";
import { useP2PSync } from "@/lib/hooks/use-p2p-sync";
import { RefreshCcwIcon, CheckIcon } from "@/components/icons";

export function SyncStatus() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { state, isConnected, isSyncing } = useP2PSync();

  const getStatusColor = () => {
    switch (state) {
      case "connected":
        return "text-green-500";
      case "syncing":
        return "text-yellow-500";
      case "connecting":
      case "waiting":
        return "text-blue-500";
      case "error":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getTooltipText = () => {
    switch (state) {
      case "connected":
        return "Devices synced";
      case "syncing":
        return "Syncing...";
      case "connecting":
        return "Connecting...";
      case "waiting":
        return "Waiting for device...";
      case "error":
        return "Connection error";
      default:
        return "Not connected - click to sync";
    }
  };

  const handleInteractionStart = () => setIsPressed(true);
  const handleInteractionEnd = () => setIsPressed(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDialogOpen(true)}
        onMouseEnter={handleInteractionStart}
        onMouseLeave={handleInteractionEnd}
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        className={`relative ${getStatusColor()}`}
        title={getTooltipText()}
      >
        <AnimatePresence mode="wait">
          {isConnected && !isSyncing ? (
            <motion.div
              key="check"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CheckIcon size={16} animate={isPressed} />
            </motion.div>
          ) : (
            <motion.div
              key="refresh"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <RefreshCcwIcon size={16} animate={isPressed} spinning={isSyncing} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status indicator dot */}
        {isConnected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
              isSyncing ? "bg-yellow-500" : "bg-green-500"
            }`}
          />
        )}
      </Button>

      <SyncDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

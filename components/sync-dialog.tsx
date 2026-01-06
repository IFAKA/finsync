"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  Share2,
  Clock,
} from "lucide-react";
import { WifiIcon, SmartphoneIcon } from "@/components/icons";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Card, CardContent } from "@/components/ui/card";
import { useP2PSync } from "@/lib/hooks/use-p2p-sync";
import {
  isValidRoomCode,
  normalizeRoomCode,
  getRoomShareUrl,
  getVerificationEmojis,
  getRoomExpirySeconds,
} from "@/lib/p2p/room-code";

type DialogMode = "choose" | "create" | "join" | "syncing" | "success";

interface SyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: DialogMode;
  onSyncComplete?: () => void;
}

// Animated card component for sync options
function SyncOptionCard({
  icon: Icon,
  title,
  description,
  onClick,
  animateOnMount = false,
  delay = 0,
}: {
  icon: typeof WifiIcon;
  title: string;
  description: string;
  onClick: () => void;
  animateOnMount?: boolean;
  delay?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Trigger animation on mount for mobile
  useEffect(() => {
    if (animateOnMount && !hasAnimated) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, delay * 1000 + 300); // 300ms after dialog animation
      return () => clearTimeout(timer);
    }
  }, [animateOnMount, delay, hasAnimated]);

  // Reset animation state when component unmounts
  useEffect(() => {
    return () => setHasAnimated(false);
  }, []);

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon size={20} className="text-primary" animate={isHovered || hasAnimated} />
        </div>
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export function SyncDialog({ open, onOpenChange, initialMode = "choose", onSyncComplete }: SyncDialogProps) {
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

  // Auto-transition to syncing mode when connected
  useEffect(() => {
    if (isConnected && mode !== "syncing" && mode !== "success") {
      setMode("syncing");
    }
  }, [isConnected, mode]);

  // Track when sync actually starts
  useEffect(() => {
    if (isSyncing && !hasStartedSync) {
      setHasStartedSync(true);
    }
  }, [isSyncing, hasStartedSync]);

  // Auto-transition to success and close when sync completes
  useEffect(() => {
    if (isConnected && !isSyncing && hasStartedSync && mode === "syncing" && !hasCompletedSync) {
      setHasCompletedSync(true);
      setMode("success");

      // Call onSyncComplete callback if provided
      onSyncComplete?.();

      // Auto-close after 2 seconds
      const timer = setTimeout(() => {
        disconnect();
        onOpenChange(false);
        setMode(initialMode);
        setHasStartedSync(false);
        setHasCompletedSync(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, isSyncing, hasStartedSync, mode, hasCompletedSync, disconnect, onOpenChange, onSyncComplete, initialMode]);

  const handleCreateRoom = async () => {
    setMode("create");
    try {
      await createRoom();
    } catch {
      toast.error("Failed to create room");
      setMode("choose");
    }
  };

  const handleJoinRoom = async () => {
    const normalized = normalizeRoomCode(inputCode);

    if (!isValidRoomCode(normalized)) {
      setJoinError("Invalid format. Example: BLUE-TIGER-FAST-STORM-A7K2");
      return;
    }

    setJoinError(null);

    try {
      await joinRoom(normalized);
      // Mode will auto-transition to "syncing" via useEffect when connected
      toast.success("Connected!");
    } catch {
      setJoinError("Failed to connect. Check the code and try again.");
    }
  };

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

  const handleCopyCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied!");
  };

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
        // User cancelled or share failed, fallback to copy
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDisconnect = () => {
    disconnect();
    setMode("choose");
    setInputCode("");
    toast.info("Disconnected");
  };

  // Reset mode when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMode(initialMode);
      setInputCode("");
      setJoinError(null);
      setHasStartedSync(false);
      setHasCompletedSync(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {mode === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle>Sync Devices</DialogTitle>
                <DialogDescription>
                  Connect two devices to sync your data directly via P2P
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <SyncOptionCard
                  icon={WifiIcon}
                  title="Create Room"
                  description="Generate a code to share"
                  onClick={handleCreateRoom}
                  animateOnMount
                  delay={0}
                />

                <SyncOptionCard
                  icon={SmartphoneIcon}
                  title="Join Room"
                  description="Enter code from another device"
                  onClick={() => setMode("join")}
                  animateOnMount
                  delay={0.1}
                />
              </div>
            </motion.div>
          )}

          {mode === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle>Room Created</DialogTitle>
                <DialogDescription>
                  Scan QR or share link with your other device
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {state === "connecting" || state === "waiting" ? (
                  <>
                    {roomCode ? (
                      <div className="space-y-4">
                        {/* QR Code */}
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex justify-center"
                        >
                          <div className="p-4 bg-white rounded-xl">
                            <QRCodeSVG
                              value={getRoomShareUrl(roomCode)}
                              size={160}
                              level="M"
                            />
                          </div>
                        </motion.div>

                        {/* Timer */}
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>Expires in {formatTime(expirySeconds)}</span>
                        </div>

                        {/* Verification Emojis */}
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs text-muted-foreground mr-2">
                            Verify:
                          </span>
                          <span className="text-2xl tracking-wider">
                            {getVerificationEmojis(roomCode).join(" ")}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 justify-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyCode}
                          >
                            {copied ? (
                              <Check className="w-4 h-4 mr-2 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 mr-2" />
                            )}
                            Copy Code
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleShare}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                        </div>

                        <p className="text-center text-sm text-muted-foreground">
                          Waiting for connection...
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-16">
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
                <Button variant="secondary" onClick={handleDisconnect}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {mode === "join" && (
            <motion.div
              key="join"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle>Join Room</DialogTitle>
                <DialogDescription>
                  Scan QR code or enter the room code
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <Input
                  placeholder="BLUE-TIGER-FAST-STORM-A7K2"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  className="text-center font-mono text-sm tracking-wider"
                  maxLength={30}
                  autoFocus
                />

                {/* Show verification emojis when valid code entered */}
                {isValidRoomCode(inputCode) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span className="text-xs text-muted-foreground">
                      Verify these match:
                    </span>
                    <span className="text-2xl">
                      {getVerificationEmojis(inputCode).join(" ")}
                    </span>
                  </motion.div>
                )}

                {joinError && (
                  <p className="text-sm text-red-500 text-center">{joinError}</p>
                )}

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
                <Button
                  onClick={handleJoinRoom}
                  disabled={inputCode.length < 10 || state === "connecting"}
                >
                  {state === "connecting" ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {mode === "syncing" && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-8"
            >
              <VisuallyHidden.Root>
                <DialogTitle>Syncing devices</DialogTitle>
              </VisuallyHidden.Root>
              <div className="flex flex-col items-center justify-center space-y-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-16 h-16 text-primary" />
                </motion.div>

                <div className="text-center space-y-2">
                  <p className="text-xl font-semibold">Syncing...</p>
                  <p className="text-sm text-muted-foreground">
                    Transferring your data securely
                  </p>
                </div>

                {/* Verification Emojis */}
                {roomCode && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-foreground rounded-lg">
                    <span className="text-sm text-background/70">Verified:</span>
                    <span className="text-2xl">
                      {getVerificationEmojis(roomCode).join(" ")}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {mode === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="py-8"
            >
              <VisuallyHidden.Root>
                <DialogTitle>Sync complete</DialogTitle>
              </VisuallyHidden.Root>
              <div className="flex flex-col items-center justify-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                >
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                </motion.div>

                <div className="text-center space-y-2">
                  <p className="text-xl font-semibold">Synced!</p>
                  <p className="text-sm text-muted-foreground">
                    Your data is up to date
                  </p>
                </div>

                {/* Verification Emojis */}
                {roomCode && (
                  <div className="flex items-center justify-center gap-2 p-3 bg-foreground rounded-lg">
                    <span className="text-sm text-background/70">Verified:</span>
                    <span className="text-2xl">
                      {getVerificationEmojis(roomCode).join(" ")}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

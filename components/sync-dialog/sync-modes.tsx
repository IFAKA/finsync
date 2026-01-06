"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  isValidRoomCode,
  getRoomShareUrl,
  getVerificationEmojis,
} from "@/lib/p2p/room-code";

// SyncOptionCard for choose mode
interface SyncOptionCardProps {
  icon: typeof WifiIcon;
  title: string;
  description: string;
  onClick: () => void;
  animateOnMount?: boolean;
  delay?: number;
}

export function SyncOptionCard({
  icon: Icon,
  title,
  description,
  onClick,
  animateOnMount = false,
  delay = 0,
}: SyncOptionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (animateOnMount && !hasAnimated) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, delay * 1000 + 300);
      return () => clearTimeout(timer);
    }
  }, [animateOnMount, delay, hasAnimated]);

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

// Choose Mode
interface ChooseModeProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export function SyncChooseMode({ onCreateRoom, onJoinRoom }: ChooseModeProps) {
  return (
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
          onClick={onCreateRoom}
          animateOnMount
          delay={0}
        />

        <SyncOptionCard
          icon={SmartphoneIcon}
          title="Join Room"
          description="Enter code from another device"
          onClick={onJoinRoom}
          animateOnMount
          delay={0.1}
        />
      </div>
    </motion.div>
  );
}

// Create Mode
interface CreateModeProps {
  roomCode: string | null;
  state: string;
  expirySeconds: number;
  copied: boolean;
  onCopyCode: () => void;
  onShare: () => void;
  onBack: () => void;
  onCancel: () => void;
  formatTime: (seconds: number) => string;
}

export function SyncCreateMode({
  roomCode,
  state,
  expirySeconds,
  copied,
  onCopyCode,
  onShare,
  onBack,
  onCancel,
  formatTime,
}: CreateModeProps) {
  return (
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

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Expires in {formatTime(expirySeconds)}</span>
                </div>

                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs text-muted-foreground mr-2">
                    Verify:
                  </span>
                  <span className="text-2xl tracking-wider">
                    {getVerificationEmojis(roomCode).join(" ")}
                  </span>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button variant="secondary" size="sm" onClick={onCopyCode}>
                    {copied ? (
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Copy Code
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onShare}>
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
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

// Join Mode
interface JoinModeProps {
  inputCode: string;
  state: string;
  joinError: string | null;
  error: string | null;
  onInputChange: (value: string) => void;
  onJoin: () => void;
  onBack: () => void;
}

export function SyncJoinMode({
  inputCode,
  state,
  joinError,
  error,
  onInputChange,
  onJoin,
  onBack,
}: JoinModeProps) {
  return (
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
          onChange={(e) => onInputChange(e.target.value)}
          className="text-center font-mono text-sm tracking-wider"
          maxLength={30}
          autoFocus
        />

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
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={onJoin}
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
  );
}

// Connected Mode (shown briefly before sync starts)
interface ConnectedModeProps {
  roomCode: string | null;
}

export function SyncConnectedMode({ roomCode }: ConnectedModeProps) {
  return (
    <motion.div
      key="connected"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="py-8"
    >
      <VisuallyHidden.Root>
        <DialogTitle>Connected</DialogTitle>
      </VisuallyHidden.Root>
      <div className="flex flex-col items-center justify-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
            <Check className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        <div className="text-center space-y-2">
          <p className="text-xl font-semibold">Connected!</p>
          <p className="text-sm text-muted-foreground">
            Starting sync...
          </p>
        </div>

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
  );
}

// Syncing Mode
interface SyncingModeProps {
  roomCode: string | null;
  progress?: { current: number; total: number; phase: string } | null;
}

export function SyncSyncingMode({ roomCode, progress }: SyncingModeProps) {
  const percentage = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "sending": return "Sending data...";
      case "receiving": return "Receiving data...";
      case "merging": return "Merging changes...";
      default: return "Syncing...";
    }
  };

  return (
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
          <p className="text-xl font-semibold">
            {progress ? getPhaseLabel(progress.phase) : "Syncing..."}
          </p>
          <p className="text-sm text-muted-foreground">
            Transferring your data securely
          </p>
        </div>

        {/* Progress bar */}
        {progress && progress.total > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {progress.current} / {progress.total} items ({percentage}%)
            </p>
          </div>
        )}

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
  );
}

// Success Mode
interface SuccessModeProps {
  roomCode: string | null;
}

export function SyncSuccessMode({ roomCode }: SuccessModeProps) {
  return (
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
  );
}

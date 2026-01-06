"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useP2PSync } from "@/lib/hooks/use-p2p-sync";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import {
  isValidRoomCode,
  normalizeRoomCode,
  getVerificationEmojis,
} from "@/lib/p2p/room-code";

type SyncStatus = "validating" | "connecting" | "syncing" | "success" | "error";

function SyncPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomParam = searchParams.get("room");
  const { completeOnboarding } = useOnboarding();

  const [status, setStatus] = useState<SyncStatus>("validating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedSync = useRef(false);
  const hasCompletedSync = useRef(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { joinRoom, disconnect, isConnected, isSyncing } = useP2PSync();

  useEffect(() => {
    console.log(`[SyncPage] Initial effect, roomParam: ${roomParam}`);
    if (!roomParam) {
      console.log(`[SyncPage] No room code provided`);
      setStatus("error");
      setErrorMessage("No room code provided");
      return;
    }

    const normalized = normalizeRoomCode(roomParam);
    console.log(`[SyncPage] Normalized room code: ${normalized}`);

    if (!isValidRoomCode(normalized)) {
      console.log(`[SyncPage] Invalid room code format`);
      setStatus("error");
      setErrorMessage("Invalid room code format");
      return;
    }

    // Auto-join the room
    console.log(`[SyncPage] Joining room...`);
    setStatus("connecting");
    joinRoom(normalized)
      .then(() => {
        console.log(`[SyncPage] joinRoom completed successfully`);
        // Will transition to syncing via useEffect
      })
      .catch((err) => {
        console.error(`[SyncPage] joinRoom failed:`, err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to connect");
      });
  }, [roomParam, joinRoom]);

  // Transition to syncing state when connected
  useEffect(() => {
    console.log(`[SyncPage] Connected check: isConnected=${isConnected}, status=${status}`);
    if (isConnected && status !== "syncing" && status !== "success") {
      console.log(`[SyncPage] Transitioning to syncing`);
      setStatus("syncing");
    }
  }, [isConnected, status]);

  // Track when sync actually starts
  useEffect(() => {
    console.log(`[SyncPage] Sync start check: isSyncing=${isSyncing}, hasStartedSync=${hasStartedSync.current}`);
    if (isSyncing && !hasStartedSync.current) {
      console.log(`[SyncPage] Sync has started`);
      hasStartedSync.current = true;
    }
  }, [isSyncing]);

  // Transition to success and auto-close when sync completes
  useEffect(() => {
    console.log(`[SyncPage] Success check: isConnected=${isConnected}, isSyncing=${isSyncing}, hasStartedSync=${hasStartedSync.current}, status=${status}, hasCompletedSync=${hasCompletedSync.current}`);
    if (isConnected && !isSyncing && hasStartedSync.current && status === "syncing" && !hasCompletedSync.current) {
      console.log(`[SyncPage] Sync complete! Transitioning to success`);
      hasCompletedSync.current = true;
      setStatus("success");

      // Mark onboarding as complete (important for new devices syncing via QR code)
      completeOnboarding();

      // Auto-redirect after 2 seconds (use ref to prevent cleanup from clearing it)
      autoCloseTimerRef.current = setTimeout(() => {
        console.log(`[SyncPage] Auto-closing, navigating to /`);
        disconnect();
        router.push("/");
        autoCloseTimerRef.current = null;
      }, 2000);
    }
  }, [isConnected, isSyncing, status, disconnect, router, completeOnboarding]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  const emojis = roomParam ? getVerificationEmojis(normalizeRoomCode(roomParam)) : [];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <Card>
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {status === "validating" && (
                <motion.div
                  key="validating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <RefreshCw className="w-12 h-12 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Validating room code...</p>
                </motion.div>
              )}

              {status === "connecting" && (
                <motion.div
                  key="connecting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <RefreshCw className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <p className="font-medium">Connecting...</p>

                  {/* Verification emojis */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Verify these emojis match the other device:
                    </p>
                    <p className="text-3xl">{emojis.join(" ")}</p>
                  </div>
                </motion.div>
              )}

              {status === "syncing" && (
                <motion.div
                  key="syncing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="py-4"
                >
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
                    <div className="flex items-center justify-center gap-2 p-3 bg-foreground rounded-lg">
                      <span className="text-sm text-background/70">Verified:</span>
                      <span className="text-2xl">{emojis.join(" ")}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {status === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="py-4"
                >
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
                    <div className="flex items-center justify-center gap-2 p-3 bg-foreground rounded-lg">
                      <span className="text-sm text-background/70">Verified:</span>
                      <span className="text-2xl">{emojis.join(" ")}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center space-y-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                  >
                    <X className="w-12 h-12 mx-auto text-red-500" />
                  </motion.div>

                  <div>
                    <p className="font-medium text-lg">Connection Failed</p>
                    <p className="text-sm text-red-500">{errorMessage}</p>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={() => router.push("/")} variant="secondary" className="w-full">
                      Go Back
                    </Button>
                    {roomParam && isValidRoomCode(roomParam) && (
                      <Button
                        onClick={() => {
                          setStatus("connecting");
                          setErrorMessage(null);
                          hasStartedSync.current = false;
                          hasCompletedSync.current = false;
                          joinRoom(normalizeRoomCode(roomParam)).catch((err) => {
                            setStatus("error");
                            setErrorMessage(err.message || "Failed to connect");
                          });
                        }}
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function SyncPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <RefreshCw className="w-12 h-12 mx-auto animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SyncPage() {
  return (
    <Suspense fallback={<SyncPageLoading />}>
      <SyncPageContent />
    </Suspense>
  );
}

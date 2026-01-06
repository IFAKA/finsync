"use client";

import Link from "next/link";
import { Volume2, VolumeX, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { soundSystem, playSound } from "@/lib/sounds";
import { SyncStatus } from "@/components/sync-status";
import { SettingsIcon } from "@/components/icons";
import { localDB } from "@/lib/db/local-db";
import { toast } from "sonner";
import { useOnboarding } from "@/lib/contexts/onboarding-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function MobileHeader() {
  const { resetOnboarding } = useOnboarding();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setSoundEnabled(soundSystem.isEnabled());
  }, []);

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundSystem.setEnabled(newState);
    if (newState) {
      playSound("toggle");
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await localDB.resetAllData();
      resetOnboarding();
      toast.success("All data has been reset");
      playSound("delete");
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to reset data:", error);
      toast.error("Failed to reset data");
      playSound("error");
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden">
      <div className="px-4">
        <div className="flex h-12 items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-lg flex items-center h-10"
            onClick={() => playSound("click")}
          >
Budget.
          </Link>

          <div className="flex items-center gap-1">
            <SyncStatus />

            <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  aria-label="Settings"
                >
                  <SettingsIcon size={20} animate={settingsOpen} />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={toggleSound} className="cursor-pointer">
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Sound effects on
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      Sound effects off
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowResetDialog(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset all data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Reset all data?"
        description="This will permanently delete all your transactions, budgets, and rules. Default categories will be restored. This action cannot be undone."
        confirmLabel={isResetting ? "Resetting..." : "Reset everything"}
        variant="destructive"
        onConfirm={handleReset}
        isLoading={isResetting}
      />
    </header>
  );
}

"use client";

import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { soundSystem, playSound } from "@/lib/sounds";
import { SyncStatus } from "@/components/sync-status";
import { SettingsIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MobileHeader() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

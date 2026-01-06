"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { soundSystem, playSound } from "@/lib/sounds";
import { SyncStatus } from "@/components/sync-status";
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
import {
  LayoutDashboardIcon,
  ArrowLeftRightIcon,
  TargetIcon,
  WandIcon,
  SettingsIcon,
} from "@/components/icons";

const navItems = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboardIcon },
  { href: "/transactions", label: "Transactions", Icon: ArrowLeftRightIcon },
  { href: "/budgets", label: "Budgets", Icon: TargetIcon },
  { href: "/rules", label: "Rules", Icon: WandIcon },
];

function NavItem({ href, label, Icon }: { href: string; label: string; Icon: typeof LayoutDashboardIcon }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Link
        href={href}
        onClick={() => playSound("click")}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
          isActive
            ? "bg-muted/50 text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
      >
        <Icon
          size={16}
          animate={isActive || isHovered}
          className={cn(isActive && "[&_svg]:stroke-[2.5px]")}
        />
        {label}
      </Link>
    </motion.div>
  );
}

export function NavHeader() {
  const { resetOnboarding } = useOnboarding();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settingsHovered, setSettingsHovered] = useState(false);
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hidden sm:block">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/"
              className="font-semibold text-lg"
              onClick={() => playSound("click")}
            >
              Budget.
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}

            <div className="w-px h-6 bg-border mx-2" />

            {/* Sync Status */}
            <SyncStatus />

            {/* Settings dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onHoverStart={() => setSettingsHovered(true)}
                  onHoverEnd={() => setSettingsHovered(false)}
                  className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/30 transition-colors"
                  aria-label="Settings"
                >
                  <SettingsIcon size={16} animate={settingsHovered} />
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
          </nav>
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

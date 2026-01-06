"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { soundSystem, playSound } from "@/lib/sounds";
import { SyncStatus } from "@/components/sync-status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settingsHovered, setSettingsHovered] = useState(false);

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
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { useIsLandscape } from "@/lib/hooks/use-media-query";
import { useSwipeNavigation } from "@/lib/hooks/use-swipe";
import {
  LayoutDashboardIcon,
  ArrowLeftRightIcon,
  TargetIcon,
  WandIcon,
} from "@/components/icons";

const navItems = [
  { href: "/", label: "Home", Icon: LayoutDashboardIcon },
  { href: "/transactions", label: "Transactions", Icon: ArrowLeftRightIcon },
  { href: "/budgets", label: "Budgets", Icon: TargetIcon },
  { href: "/rules", label: "Rules", Icon: WandIcon },
];

const navPaths = navItems.map((item) => item.href);

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isLandscape = useIsLandscape();

  // Swipe navigation between pages
  const { handlers: swipeHandlers } = useSwipeNavigation(
    navPaths,
    pathname,
    (newPath) => {
      playSound("click");
      router.push(newPath);
    }
  );

  // Hide nav in landscape mode on small screens to maximize vertical space
  const isMobileLandscape = isLandscape && typeof window !== "undefined" && window.innerHeight < 500;

  if (isMobileLandscape) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      {...swipeHandlers}
    >
      {/* Gradient fade effect above nav */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      <div className="bg-background/95 backdrop-blur-lg border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const { Icon } = item;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => playSound("click")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-colors relative touch-feedback",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground active:text-foreground"
                )}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-muted/60 rounded-xl"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}

                <motion.div
                  className="relative z-10"
                  whileTap={{ scale: 0.9 }}
                  animate={isActive ? { y: -2 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon
                    size={20}
                    animate={isActive}
                    className={cn(isActive && "[&_svg]:stroke-[2.5px]")}
                  />
                </motion.div>

                <span
                  className={cn(
                    "text-[10px] relative z-10 transition-all",
                    isActive ? "font-medium" : "font-normal"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

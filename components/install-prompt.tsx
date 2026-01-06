"use client";

import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";

/**
 * Invisible component that manages PWA install prompts via toast.
 * Shows a toast after engagement signals (2nd visit or user action).
 */
export function InstallPrompt() {
  // The hook handles all the logic - showing toast on repeat visits
  useInstallPrompt();

  // This component renders nothing - toast is shown by the hook
  return null;
}

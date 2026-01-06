"use client";

import { useEffect, useRef } from "react";
import { Toaster as Sonner, toast } from "sonner";
import { playSound } from "@/lib/sounds";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Hook to play sounds when toasts appear
function useToastSounds() {
  const toastIds = useRef(new Set<string | number>());

  useEffect(() => {
    // Subscribe to toast events via the toast store
    const originalSuccess = toast.success;
    const originalError = toast.error;
    const originalWarning = toast.warning;

    // Override toast methods to add sound
    toast.success = (message, options) => {
      playSound("success");
      return originalSuccess(message, options);
    };

    toast.error = (message, options) => {
      playSound("error");
      return originalError(message, options);
    };

    toast.warning = (message, options) => {
      playSound("warning");
      return originalWarning(message, options);
    };

    return () => {
      // Restore original methods
      toast.success = originalSuccess;
      toast.error = originalError;
      toast.warning = originalWarning;
    };
  }, []);
}

const Toaster = ({ ...props }: ToasterProps) => {
  useToastSounds();

  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-foreground group-[.toast]:text-background",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-success group-[.toaster]:text-success",
          error: "group-[.toaster]:border-error group-[.toaster]:text-error",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

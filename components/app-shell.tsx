"use client";

import { type ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OnboardingProvider, useOnboarding } from "@/lib/contexts/onboarding-context";
import { NavHeader } from "@/components/nav-header";
import { MobileHeader } from "@/components/mobile-header";
import { MobileNav } from "@/components/mobile-nav";
import { Onboarding } from "@/components/onboarding";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { type UploadResult } from "@/components/upload-dropzone";
import { TransactionPreview } from "@/components/transaction-preview";
import { SyncDialog } from "@/components/sync-dialog";
import { Loader2 } from "lucide-react";
import { useIsMobile, useIsLandscape } from "@/lib/hooks/use-media-query";

// Routes that should bypass onboarding (e.g., P2P sync link from QR code)
const ONBOARDING_BYPASS_ROUTES = ["/sync"];

function AppContent({ children }: { children: ReactNode }) {
  const { isOnboardingComplete, isLoading, completeOnboarding } = useOnboarding();
  const pathname = usePathname();
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

  // Check if current route should bypass onboarding (e.g., /sync page for QR code links)
  const shouldBypassOnboarding = ONBOARDING_BYPASS_ROUTES.some((route) =>
    pathname?.startsWith(route)
  );

  // Use drawer on mobile portrait, dialog on tablet/desktop or landscape
  const useDrawerUI = isMobile && !isLandscape;

  const handleUploadComplete = (result: UploadResult) => {
    setUploadResult(result);
    setUploadOpen(true);
  };

  const handleImportComplete = () => {
    if (!isOnboardingComplete) {
      completeOnboarding();
    }
    setUploadResult(null);
    setUploadOpen(false);
  };

  const handleBack = () => {
    setUploadResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!isOnboardingComplete && uploadResult && !open) {
      return;
    }
    setUploadOpen(open);
    if (!open) {
      setUploadResult(null);
    }
  };


  const handleOnboardingSync = () => {
    setSyncOpen(true);
  };

  const handleSyncComplete = () => {
    completeOnboarding();
    // Redirect to dashboard after the dialog auto-closes (2.5s + buffer)
    setTimeout(() => {
      router.push("/");
    }, 3000);
  };

  // Show loading spinner while checking onboarding state
  if (isLoading) {
    return (
      <main id="main-content" className="flex items-center justify-center min-h-screen safe-area-left safe-area-right" role="status">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading application...</span>
      </main>
    );
  }

  // Bypass onboarding for certain routes (e.g., /sync page from QR code)
  // These routes handle their own completion of onboarding after success
  if (shouldBypassOnboarding) {
    return <>{children}</>;
  }

  // Show onboarding if not complete
  if (!isOnboardingComplete) {
    return (
      <>
        <main className="min-h-screen">
          <Onboarding
            onSyncClick={handleOnboardingSync}
            onUploadComplete={handleUploadComplete}
          />
        </main>

        {/* Sync dialog for onboarding - starts in join mode */}
        <SyncDialog
          open={syncOpen}
          onOpenChange={setSyncOpen}
          initialMode="join"
          onSyncComplete={handleSyncComplete}
        />

        {/* Mobile portrait: Bottom drawer for preview */}
        {useDrawerUI ? (
          <Drawer open={uploadOpen} onOpenChange={handleOpenChange}>
            <DrawerContent className="max-h-[85vh]" aria-describedby={undefined}>
              <VisuallyHidden.Root>
                <DrawerTitle>Import transactions</DrawerTitle>
              </VisuallyHidden.Root>
              {uploadResult ? (
                <div className="px-4 pb-8 pt-2 overflow-y-auto">
                  <TransactionPreview
                    filename={uploadResult.filename}
                    bankName={uploadResult.bankName}
                    transactions={uploadResult.transactions}
                    onBack={handleBack}
                    onImportComplete={handleImportComplete}
                  />
                </div>
              ) : null}
            </DrawerContent>
          </Drawer>
        ) : (
          /* Desktop/tablet/landscape: Modal dialog */
          <Dialog open={uploadOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-xl md:max-w-2xl">
              {uploadResult && (
                <>
                  <VisuallyHidden.Root>
                    <DialogTitle>Review transactions</DialogTitle>
                  </VisuallyHidden.Root>
                  <TransactionPreview
                    filename={uploadResult.filename}
                    bankName={uploadResult.bankName}
                    transactions={uploadResult.transactions}
                    onBack={handleBack}
                    onImportComplete={handleImportComplete}
                  />
                </>
              )}
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  // Show full app when onboarding is complete
  return (
    <>
      <NavHeader />
      <MobileHeader />
      <main id="main-content" className="min-h-[calc(100vh-3.5rem)] pb-20 sm:pb-0 safe-area-left safe-area-right">
        {children}
      </main>
      <MobileNav />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <OnboardingProvider>
      <AppContent>{children}</AppContent>
    </OnboardingProvider>
  );
}

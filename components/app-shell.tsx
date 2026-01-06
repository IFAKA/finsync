"use client";

import { type ReactNode, useState, useRef, useCallback } from "react";
import { OnboardingProvider, useOnboarding } from "@/lib/contexts/onboarding-context";
import { NavHeader } from "@/components/nav-header";
import { MobileHeader } from "@/components/mobile-header";
import { MobileNav } from "@/components/mobile-nav";
import { Onboarding } from "@/components/onboarding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { UploadDropzone, type UploadResult } from "@/components/upload-dropzone";
import { TransactionPreview } from "@/components/transaction-preview";
import { parseExcelBuffer } from "@/lib/excel/parser";
import { playSound } from "@/lib/sounds";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useIsMobile, useIsLandscape } from "@/lib/hooks/use-media-query";

function AppContent({ children }: { children: ReactNode }) {
  const { isOnboardingComplete, isLoading, completeOnboarding } = useOnboarding();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

  // Use drawer on mobile portrait, dialog on tablet/desktop or landscape
  const useDrawerUI = isMobile && !isLandscape;

  const handleUploadComplete = (result: UploadResult) => {
    setUploadResult(result);
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

  // Mobile: Direct file picker flow
  const handleMobileFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be selected again
    e.target.value = "";

    // Validate file
    const validExtensions = [".xlsx", ".xls"];
    const isValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!isValidExt) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      playSound("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      playSound("error");
      return;
    }

    setIsProcessingFile(true);
    setUploadOpen(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelBuffer(buffer, file.name);

      setUploadResult({
        filename: result.filename,
        bankName: result.bankFormat?.name || null,
        transactions: result.transactions.map((t) => ({
          date: t.date.toISOString(),
          description: t.description,
          amount: t.amount,
          balance: t.balance,
        })),
      });
      playSound("complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
      playSound("error");
      setUploadOpen(false);
    } finally {
      setIsProcessingFile(false);
    }
  }, []);

  const handleOnboardingUpload = () => {
    if (isMobile) {
      // Mobile: trigger file picker directly
      fileInputRef.current?.click();
    } else {
      // Desktop: open modal with dropzone
      setUploadOpen(true);
    }
  };

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Show onboarding if not complete
  if (!isOnboardingComplete) {
    return (
      <>
        {/* Hidden file input for mobile */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleMobileFileSelect}
          className="hidden"
        />

        <main className="min-h-screen">
          <Onboarding onUploadClick={handleOnboardingUpload} />
        </main>

        {/* Mobile portrait: Bottom drawer for preview */}
        {useDrawerUI ? (
          <Drawer open={uploadOpen} onOpenChange={handleOpenChange}>
            <DrawerContent className="max-h-[85vh]">
              {isProcessingFile ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">Processing file...</p>
                </div>
              ) : uploadResult ? (
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
              {!uploadResult ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Import Statement</DialogTitle>
                    <DialogDescription>
                      Upload your bank statement to import transactions
                    </DialogDescription>
                  </DialogHeader>
                  <UploadDropzone onUploadComplete={handleUploadComplete} />
                </>
              ) : (
                <TransactionPreview
                  filename={uploadResult.filename}
                  bankName={uploadResult.bankName}
                  transactions={uploadResult.transactions}
                  onBack={handleBack}
                  onImportComplete={handleImportComplete}
                />
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
      <main className="min-h-[calc(100vh-3.5rem)] pb-20 sm:pb-0">
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

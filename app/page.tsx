"use client";

import { useState } from "react";
import { UploadDropzone, type UploadResult } from "@/components/upload-dropzone";
import { TransactionPreview } from "@/components/transaction-preview";
import { Dashboard } from "@/components/dashboard";
import {
  ResponsiveModal,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

export default function Home() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleUploadComplete = (result: UploadResult) => {
    setUploadResult(result);
  };

  const handleImportComplete = () => {
    setUploadResult(null);
    setUploadOpen(false);
  };

  const handleBack = () => {
    setUploadResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    setUploadOpen(open);
    if (!open) {
      setUploadResult(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <Dashboard onUploadClick={() => setUploadOpen(true)} />

      <ResponsiveModal open={uploadOpen} onOpenChange={handleOpenChange} className="sm:max-w-xl">
        {!uploadResult ? (
          <>
            <ResponsiveModalHeader>
              <ResponsiveModalTitle>Import Statement</ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Upload your bank statement to import transactions
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="p-4 sm:p-0">
              <UploadDropzone onUploadComplete={handleUploadComplete} />
            </div>
          </>
        ) : (
          <>
            <VisuallyHidden.Root>
              <ResponsiveModalTitle>Review transactions</ResponsiveModalTitle>
            </VisuallyHidden.Root>
            <div className="p-4 sm:p-0">
              <TransactionPreview
                filename={uploadResult.filename}
                bankName={uploadResult.bankName}
                transactions={uploadResult.transactions}
                onBack={handleBack}
                onImportComplete={handleImportComplete}
              />
            </div>
          </>
        )}
      </ResponsiveModal>
    </div>
  );
}

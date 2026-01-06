"use client";

import { useState } from "react";
import { UploadDropzone, type UploadResult } from "@/components/upload-dropzone";
import { TransactionPreview } from "@/components/transaction-preview";
import { Dashboard } from "@/components/dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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

      <Dialog open={uploadOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl">
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
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { parseExcelBuffer } from "@/lib/excel/parser";

export interface UploadResult {
  filename: string;
  bankName: string | null;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    balance?: number;
  }>;
}

interface UploadDropzoneProps {
  onUploadComplete: (result: UploadResult) => void;
}

export function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validExtensions = [".xlsx", ".xls"];

    const isValidType =
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      playSound("error");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      playSound("error");
      return false;
    }

    setError(null);
    return true;
  }, []);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;

      setIsLoading(true);
      setUploadedFile(file);
      setError(null);

      try {
        const buffer = await file.arrayBuffer();
        const result = await parseExcelBuffer(buffer, file.name);

        onUploadComplete({
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
        setError(err instanceof Error ? err.message : "Failed to parse file");
        setUploadedFile(null);
        playSound("error");
      } finally {
        setIsLoading(false);
      }
    },
    [validateFile, onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  return (
    <div
      className={cn(
        "relative border border-dashed rounded-lg p-12 transition-all duration-150",
        isDragOver
          ? "border-foreground bg-muted/5 scale-[1.01]"
          : "border-border hover:border-muted-foreground",
        isLoading && "pointer-events-none opacity-70"
      )}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {isLoading ? (
          <div className="loading-delayed">
            <Loader2 className="w-10 h-10 text-muted-foreground mb-4 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Processing file…</p>
          </div>
        ) : uploadedFile ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-8 h-8 text-foreground" />
              <div className="text-left">
                <p className="font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Check className="w-5 h-5 text-success" />
            </div>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-1">
              Drop your bank statement
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Supports Excel files from any bank
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="secondary" size="sm">
              <label htmlFor="file-upload" className="cursor-pointer">
                Browse
              </label>
            </Button>
          </>
        )}

        {error && (
          <p className="text-sm text-error mt-4">{error}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { initializeLocalDB, deduplicateCategories } from "@/lib/db/sync";

// Initialize database on first use
let dbInitialized = false;
let initPromise: Promise<void> | null = null;

export function ensureDbInitialized(): Promise<void> {
  if (dbInitialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = initializeLocalDB()
    .then(() => deduplicateCategories()) // Clean up any duplicate categories
    .then(() => {
      dbInitialized = true;
    });

  return initPromise;
}

// Hook to ensure DB is initialized
export function useDbInit() {
  const [isReady, setIsReady] = useState(dbInitialized);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    ensureDbInitialized()
      .then(() => setIsReady(true))
      .catch(setError);
  }, []);

  return { isReady, error };
}

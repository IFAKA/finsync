"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Target, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoalsTab } from "./components/goals-tab";
import { ForecastTab } from "./components/forecast-tab";
import { WhatIfTab } from "./components/what-if-tab";

type Tab = 'goals' | 'forecast' | 'whatif';

const tabs: { id: Tab; label: string; Icon: typeof Target }[] = [
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'forecast', label: 'Forecast', Icon: TrendingUp },
  { id: 'whatif', label: 'What-If', Icon: Sparkles },
];

const validTabs: Tab[] = ['goals', 'forecast', 'whatif'];

function PageLoading() {
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-border rounded" />
        <div className="h-12 bg-border rounded" />
        <div className="h-64 bg-border rounded" />
      </div>
    </div>
  );
}

function PlanningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && validTabs.includes(tabParam) ? tabParam : 'goals'
  );

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Sync from URL changes (e.g. back/forward)
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = validTabs.indexOf(activeTab);
    let newIndex = currentIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      newIndex = (currentIndex + 1) % validTabs.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      newIndex = (currentIndex - 1 + validTabs.length) % validTabs.length;
    }
    if (newIndex !== currentIndex) {
      handleTabChange(validTabs[newIndex]);
      // Focus the new tab button
      const tabButton = document.querySelector(`[data-tab="${validTabs[newIndex]}"]`) as HTMLElement;
      tabButton?.focus();
    }
  }, [activeTab, handleTabChange]);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <h1 className="sr-only md:hidden">Planning</h1>
      {/* Desktop Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:block"
      >
        <h1 className="text-2xl font-semibold">Planning</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Set savings goals, forecast your finances, and explore what-if scenarios
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Planning sections"
        className="flex gap-1 p-1 bg-muted/50 rounded-xl"
        onKeyDown={handleTabKeyDown}
      >
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`tabpanel-${id}`}
            data-tab={id}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => handleTabChange(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
              activeTab === id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {activeTab === id && (
              <motion.div
                layoutId="planning-tab-indicator"
                className="absolute inset-0 bg-background shadow-sm rounded-lg"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <Icon className="w-4 h-4 relative z-10" aria-hidden="true" />
            <span className="relative z-10 hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'goals' && <GoalsTab />}
          {activeTab === 'forecast' && <ForecastTab />}
          {activeTab === 'whatif' && <WhatIfTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function PlanningPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PlanningContent />
    </Suspense>
  );
}

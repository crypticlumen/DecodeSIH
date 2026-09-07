"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/Icon";
import BecknFlowVisualizer from "@/components/BecknFlowVisualizer";
import {
  getItem,
  setItem,
  removeItem,
} from "@/lib/persistence";
import { demoChargers } from "@/lib/demo-data";
import {
  simulateSearch,
  simulateInit,
  simulateConfirm,
  simulateFullTransaction,
  getTransactionLog,
  clearTransactionLog,
  mockSearchRequest,
  mockInitRequest,
  mockConfirmRequest,
  generateTransactionId,
} from "@/lib/beckn";
import type { BecknTransactionLogEntry } from "@/lib/beckn";

/* =====================================================================
   Beckn BAP Adapter Explorer Page — Simulated Architecture Preview
   ===================================================================== */

const STORAGE_KEY = "beckn-log";

function dedupeAndSort(
  entries: BecknTransactionLogEntry[]
): BecknTransactionLogEntry[] {
  const map = new Map<string, BecknTransactionLogEntry>();
  for (const e of entries) {
    map.set(e.messageId, e);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
  );
}

function mergeWithModuleLog(
  existing: BecknTransactionLogEntry[]
): BecknTransactionLogEntry[] {
  const moduleLogs = getTransactionLog();
  return dedupeAndSort([...existing, ...moduleLogs]);
}

export default function BecknExplorerPage() {
  const [entries, setEntries] = useState<BecknTransactionLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /* ---- Hydrate from localStorage ---- */
  useEffect(() => {
    setMounted(true);
    const stored = getItem<BecknTransactionLogEntry[]>(STORAGE_KEY, []);
    if (stored.length > 0) {
      setEntries(dedupeAndSort(stored));
    }
  }, []);

  /* ---- Persist whenever entries change ---- */
  useEffect(() => {
    if (mounted && entries.length > 0) {
      setItem(STORAGE_KEY, entries);
    }
  }, [entries, mounted]);

  const showMessage = useCallback((msg: string) => {
    setLastActionMessage(msg);
    setTimeout(() => setLastActionMessage(null), 4000);
  }, []);

  /* ---- Run full transaction lifecycle ---- */
  const handleFullTransaction = async () => {
    setRunning(true);
    try {
      const result = await simulateFullTransaction(
        demoChargers,
        {
          name: "Arjun Mehta",
          address: "12 MG Road, Bangalore, Karnataka",
          phone: "+91-9876543210",
          email: "arjun.mehta@example.com",
        },
        { latencyMs: 350, jitterMs: 100 }
      );
      const merged = mergeWithModuleLog(entries);
      setEntries(merged);
      showMessage(
        result.success
          ? `Full transaction completed: ${result.orderId}`
          : `Transaction failed: ${result.error}`
      );
    } catch (err) {
      showMessage("Simulation error: " + String(err));
    } finally {
      setRunning(false);
    }
  };

  /* ---- Simulate Search only ---- */
  const handleSearch = async () => {
    setRunning(true);
    try {
      const txId = generateTransactionId();
      const req = mockSearchRequest({
        startGps: "12.9716,77.5946",
        endGps: "12.9352,77.6245",
        vehicleType: "2W",
        city: "std:080",
      });
      req.context.transaction_id = txId;
      await simulateSearch(req, demoChargers, { latencyMs: 300 });
      const merged = mergeWithModuleLog(entries);
      setEntries(merged);
      showMessage("Search simulation completed");
    } catch (err) {
      showMessage("Search simulation error: " + String(err));
    } finally {
      setRunning(false);
    }
  };

  /* ---- Simulate Init only ---- */
  const handleInit = async () => {
    setRunning(true);
    try {
      const txId = generateTransactionId();
      const providerId = demoChargers[0].id;
      const itemIds = ["item-mock-001"];
      const billing = {
        name: "Priya Sharma",
        address: "45 Residency Road, Bangalore, Karnataka",
        phone: "+91-9876543211",
        email: "priya.sharma@example.com",
      };
      const req = mockInitRequest(txId, providerId, itemIds, billing);
      await simulateInit(req, [], 150, { latencyMs: 300 });
      const merged = mergeWithModuleLog(entries);
      setEntries(merged);
      showMessage("Init simulation completed");
    } catch (err) {
      showMessage("Init simulation error: " + String(err));
    } finally {
      setRunning(false);
    }
  };

  /* ---- Simulate Confirm only ---- */
  const handleConfirm = async () => {
    setRunning(true);
    try {
      const txId = generateTransactionId();
      const providerId = demoChargers[0].id;
      const itemIds = ["item-mock-001"];
      const billing = {
        name: "Rahul Verma",
        address: "78 Sector 5, Gurugram, Haryana",
        phone: "+91-9876543212",
        email: "rahul.verma@tatapower.com",
      };
      const payment = {
        status: "paid" as const,
        type: "PRE-ORDER" as const,
        params: { amount: "150.00", currency: "INR", transaction_id: `pay-${Date.now()}` },
      };
      const req = mockConfirmRequest(txId, providerId, itemIds, billing, payment);
      await simulateConfirm(req, [], 150, { latencyMs: 300 });
      const merged = mergeWithModuleLog(entries);
      setEntries(merged);
      showMessage("Confirm simulation completed");
    } catch (err) {
      showMessage("Confirm simulation error: " + String(err));
    } finally {
      setRunning(false);
    }
  };

  /* ---- Simulate with error ---- */
  const handleSimulateError = async () => {
    setRunning(true);
    try {
      const result = await simulateFullTransaction(
        demoChargers,
        {
          name: "Test User",
          address: "Test Address, Bangalore",
          phone: "+91-9999999999",
        },
        { latencyMs: 200, failureProbability: 0.5 }
      );
      const merged = mergeWithModuleLog(entries);
      setEntries(merged);
      showMessage(
        result.success
          ? `Transaction succeeded despite error risk`
          : `Simulated failure: ${result.error}`
      );
    } catch (err) {
      showMessage("Simulation error: " + String(err));
    } finally {
      setRunning(false);
    }
  };

  /* ---- Clear history ---- */
  const handleClear = () => {
    clearTransactionLog();
    removeItem(STORAGE_KEY);
    setEntries([]);
    showMessage("Transaction history cleared");
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ---- Page header ---- */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
          <Icon name="GitBranch" className="h-6 w-6 text-primary" />
          Beckn BAP Adapter Explorer
        </h1>
        <p className="text-sm text-muted-foreground">
          Simulate protocol flows between the ChargeSure BAP and provider BPPs
        </p>
      </div>

      {/* ---- Simulated banner ---- */}
      <Alert variant="default" className="border-amber-500/30 bg-amber-500/10">
        <Icon name="FlaskConical" className="h-5 w-5 text-amber-400" />
        <AlertTitle className="text-amber-400">Architecture Simulation Only</AlertTitle>
        <AlertDescription className="text-amber-400/80">
          All Beckn protocol integrations shown on this page are fully simulated.
          No real BPP network calls are made. This is a frontend architecture
          preview for demonstration and debugging purposes.
        </AlertDescription>
      </Alert>

      {/* ---- Control panel ---- */}
      <Card size="sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon name="SlidersHorizontal" className="h-4 w-4 text-primary" />
                Protocol Control Panel
              </CardTitle>
              <CardDescription className="text-xs">
                Trigger simulated Beckn message flows
              </CardDescription>
            </div>
            {entries.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {entries.length} log entries
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleFullTransaction}
              disabled={running}
              size="sm"
              className="gap-1.5"
            >
              {running ? (
                <Icon name="Loader2" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon name="Play" className="h-3.5 w-3.5" />
              )}
              Run Full Transaction
            </Button>

            <Button
              onClick={handleSearch}
              disabled={running}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Icon name="Search" className="h-3.5 w-3.5" />
              Search
            </Button>

            <Button
              onClick={handleInit}
              disabled={running}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Icon name="FileText" className="h-3.5 w-3.5" />
              Init
            </Button>

            <Button
              onClick={handleConfirm}
              disabled={running}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Icon name="CheckCircle" className="h-3.5 w-3.5" />
              Confirm
            </Button>

            <Button
              onClick={handleSimulateError}
              disabled={running}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Icon name="AlertTriangle" className="h-3.5 w-3.5" />
              Error Flow
            </Button>

            <Button
              onClick={handleClear}
              disabled={running || entries.length === 0}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Icon name="Trash2" className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>

          {/* Action feedback */}
          <AnimatePresence>
            {lastActionMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="default" className="py-2">
                  <AlertDescription className="flex items-center gap-2 text-xs">
                    <Icon name="Info" className="h-3.5 w-3.5 text-primary" />
                    {lastActionMessage}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {running && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name="Loader2" className="h-3.5 w-3.5 animate-spin text-primary" />
              Simulating protocol flow…
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Flow Visualizer + Transaction Feed ---- */}
      <BecknFlowVisualizer entries={entries} />
    </div>
  );
}
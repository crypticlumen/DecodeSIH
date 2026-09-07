"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { demoChargers, demoCrowdReports, demoUsers } from "@/lib/demo-data";
import { getItem } from "@/lib/persistence";
import { aggregateReports } from "@/lib/reliability";
import type { Charger, CrowdReport, User } from "@/lib/types";
import Icon from "@/components/Icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminShell from "@/components/AdminShell";
import ReliabilityChart from "@/components/ReliabilityChart";
import IncidentTable from "@/components/IncidentTable";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const router = useRouter();
  const { currentUser } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [reports, setReports] = useState<CrowdReport[]>([]);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  useEffect(() => {
    const timer = setTimeout(() => {
      const storedReports = getItem<CrowdReport[]>("crowd_reports", []);
      setChargers(demoChargers);
      setReports([...demoCrowdReports, ...storedReports]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const total = chargers.length;
    const operational = chargers.filter(
      (c) => c.operationalStatus === "operational"
    ).length;
    const unreliable = chargers.filter((c) => c.reliabilityScore < 70).length;
    const activeIncidents = reports.filter((r) => r.status !== "resolved").length;

    return {
      total,
      operational,
      operationalPercent: total > 0 ? Math.round((operational / total) * 100) : 0,
      unreliable,
      unreliablePercent: total > 0 ? Math.round((unreliable / total) * 100) : 0,
      activeIncidents,
      fleetAvgScore:
        total > 0
          ? Math.round(chargers.reduce((s, c) => s + c.reliabilityScore, 0) / total)
          : 0,
    };
  }, [chargers, reports]);

  return (
    <AdminShell>
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Total chargers
                </p>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon name="Zap" className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {stats.total}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Across all operators
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Operational
                </p>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Icon name="CheckCircle2" className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {stats.operational}
                </p>
                <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">
                  {stats.operationalPercent}%
                </Badge>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${stats.operationalPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Unreliable
                </p>
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Icon name="AlertTriangle" className="w-4 h-4 text-red-400" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    stats.unreliable > 0 ? "text-red-400" : "text-foreground"
                  )}
                >
                  {stats.unreliable}
                </p>
                <Badge
                  className={cn(
                    "text-[10px]",
                    stats.unreliable > 0
                      ? "bg-red-500/10 text-red-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  )}
                >
                  {stats.unreliablePercent}%
                </Badge>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${stats.unreliablePercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Active incidents
                </p>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Icon name="MessageSquare" className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <p
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  stats.activeIncidents > 0 ? "text-amber-400" : "text-foreground"
                )}
              >
                {stats.activeIncidents}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeIncidents === 0
                  ? "All clear"
                  : `${stats.activeIncidents} unresolved`}
              </p>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <span />
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  <button
                    onClick={() => setChartType("bar")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      chartType === "bar"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setChartType("pie")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                      chartType === "pie"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Donut
                  </button>
                </div>
              </div>
              <ReliabilityChart chargers={chargers} chartType={chartType} />
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Icon name="Target" className="w-4 h-4 text-violet-400" />
                  Fleet health
                </h3>
                <div className="text-center py-2">
                  <p className="text-4xl font-bold text-foreground tabular-nums">
                    {stats.fleetAvgScore}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fleet average reliability
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Excellent (90+)", count: chargers.filter((c) => c.reliabilityScore >= 90).length, color: "bg-emerald-500" },
                    { label: "Good (80–89)", count: chargers.filter((c) => c.reliabilityScore >= 80 && c.reliabilityScore < 90).length, color: "bg-emerald-300" },
                    { label: "Fair (70–79)", count: chargers.filter((c) => c.reliabilityScore >= 70 && c.reliabilityScore < 80).length, color: "bg-amber-400" },
                    { label: "At risk (<70)", count: chargers.filter((c) => c.reliabilityScore < 70).length, color: "bg-red-500" },
                  ].map((row) => {
                    const pct = chargers.length > 0 ? Math.round((row.count / chargers.length) * 100) : 0;
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="font-medium text-foreground tabular-nums">
                            {row.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", row.color)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Incident table */}
          <IncidentTable
            chargers={chargers}
            reports={reports}
            users={demoUsers}
          />
        </>
      )}
    </AdminShell>
  );
}
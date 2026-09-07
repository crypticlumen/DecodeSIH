"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import { demoChargers } from "@/lib/demo-data";
import {
  generateHourlyLoad,
  findOptimalChargingWindows,
  REGION_PRESETS,
  FALLBACK_REGION,
} from "@/lib/grid";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import Icon from "@/components/Icon";
import DiscomLoadChart from "@/components/DiscomLoadChart";
import PeakAlertBanner from "@/components/PeakAlertBanner";

import type { GridRegionProfile } from "@/lib/grid";
import type { Charger } from "@/lib/types";

/* =====================================================================
   DISCOM Analytics — regional grid load & EV impact visualization
   ===================================================================== */

const ChargeMap = dynamic(() => import("@/components/ChargeMap"), { ssr: false });

// Build a lookup of region presets including a default catch-all
const ALL_REGIONS: Record<string, Omit<GridRegionProfile, "hourlyData">> = {
  ...REGION_PRESETS,
  DEFAULT: FALLBACK_REGION,
};

export default function DiscomPage() {
  const router = useRouter();
  const { currentUser } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("BRPL-North");

  /* ---- Role gate ---- */
  useEffect(() => {
    setMounted(true);
    if (!currentUser) return;
    if (currentUser.role !== "discom") {
      toast.error("Access restricted", {
        description: "Only DISCOM operators can access the analytics dashboard.",
      });
      router.replace("/dashboard");
    }
  }, [currentUser, router]);

  /* ---- Derive zone list from chargers ---- */
  const distinctZones = useMemo(() => {
    const zones = new Map<string, string>();
    for (const ch of demoChargers) {
      const zoneId = ch.gridZone ?? "DEFAULT";
      const preset = ALL_REGIONS[zoneId];
      zones.set(zoneId, preset?.zoneName ?? zoneId);
    }
    return Array.from(zones.entries());
  }, []);

  /* ---- Chargers in the selected zone ---- */
  const zoneChargers = useMemo(() => {
    return demoChargers.filter((ch) => (ch.gridZone ?? "DEFAULT") === selectedZoneId);
  }, [selectedZoneId]);

  /* ---- Grid profile for selected zone ---- */
  const profile: GridRegionProfile = useMemo(() => {
    const preset = ALL_REGIONS[selectedZoneId] ?? FALLBACK_REGION;
    const hourlyData = generateHourlyLoad(preset.zoneId);
    return { ...preset, hourlyData };
  }, [selectedZoneId]);

  /* ---- Charging windows ---- */
  const windows = useMemo(() => findOptimalChargingWindows(profile.hourlyData, 3), [profile]);

  /* ---- Map chargers for selected zone ---- */
  const mapChargers: Charger[] = useMemo(() => zoneChargers, [zoneChargers]);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-80 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-lg" />
        <Skeleton className="h-12 w-64 rounded-lg" />
        <Skeleton className="h-[320px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon name="User" className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">You are not logged in.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ---- Page header ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Icon name="Zap" className="h-6 w-6 text-amber-500" />
            DISCOM Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Regional grid load monitoring, peak alerts, and EV impact visualization
          </p>
        </div>

        <Badge variant="outline" className="text-[10px]">
          <Icon name="FlaskConical" className="mr-1 h-3 w-3" />
          All grid data is simulated
        </Badge>
      </div>

      {/* ---- Zone selector ---- */}
      <Card size="sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon name="Map" className="h-4 w-4 text-blue-400" />
                Select Grid Zone
              </CardTitle>
              <CardDescription className="text-xs">
                Choose a DISCOM region to view load curves and charger distribution
              </CardDescription>
            </div>
            <Select value={selectedZoneId} onValueChange={(v: string) => setSelectedZoneId(v)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Select a zone" />
              </SelectTrigger>
              <SelectContent>
                {distinctZones.map(([zoneId, zoneName]) => (
                  <SelectItem key={zoneId} value={zoneId}>
                    <div className="flex flex-col">
                      <span className="text-sm">{zoneName}</span>
                      <span className="text-[10px] text-muted-foreground">{zoneId}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* ---- Peak Alert Banner ---- */}
      <PeakAlertBanner profile={profile} windows={windows} />

      {/* ---- Load chart ---- */}
      <DiscomLoadChart profile={profile} windows={windows} />

      {/* ---- Chargers in zone + Map ---- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Charger list */}
        <Card size="sm" className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Icon name="Plug" className="h-4 w-4 text-emerald-400" />
              Chargers in {profile.zoneName}
            </CardTitle>
            <CardDescription className="text-xs">
              {zoneChargers.length} charger{zoneChargers.length === 1 ? "" : "s"} in this grid zone
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] space-y-2 overflow-y-auto">
            {zoneChargers.length === 0 ? (
              <Empty className="min-h-[200px] border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Icon name="Plug" className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>No chargers in this zone</EmptyTitle>
                  <EmptyDescription>
                    Select a different grid region to view charger details.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              zoneChargers.map((ch) => {
                const isHighLoad = ch.reliabilityScore < 85;
                return (
                  <div
                    key={ch.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{ch.name}</span>
                        <Badge
                          variant={isHighLoad ? "destructive" : "default"}
                          className="shrink-0 text-[10px]"
                        >
                          {ch.reliabilityScore}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ch.operator} · {ch.city}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {ch.powerKw} kW
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          ₹{ch.pricePerKwh}/kWh
                        </Badge>
                        {ch.connectorTypes.slice(0, 2).map((ct) => (
                          <Badge key={ct} variant="secondary" className="text-[10px]">
                            {ct}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Icon
                      name={isHighLoad ? "AlertTriangle" : "CheckCircle"}
                      className={`mt-1 h-4 w-4 shrink-0 ${
                        isHighLoad ? "text-red-500" : "text-emerald-500"
                      }`}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Map panel */}
        <div className="lg:col-span-2">
          {zoneChargers.length === 0 ? (
            <Card size="sm" className="flex min-h-[350px] items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Icon name="Map" className="h-5 w-5" />
                  </EmptyMedia>
                  <EmptyTitle>No charger locations</EmptyTitle>
                  <EmptyDescription>
                    This zone has no mapped chargers.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </Card>
          ) : (
            <ChargeMap
              chargers={mapChargers}
              height="h-[400px]"
              fitBounds
              showControls
            />
          )}
        </div>
      </div>

      {/* ---- Simulated data banner ---- */}
      <Card size="sm" className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex items-center gap-2 py-3">
          <Icon name="Info" className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">
            All grid load data, EV fleet contribution estimates, and charging windows on this page are fully
            simulated for architecture demonstration. Production deployment requires integration with real-time
            SCADA/AMI data feeds from DISCOM systems including ABT meter data, SLDC load dispatch schedules,
            and renewable generation forecasts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
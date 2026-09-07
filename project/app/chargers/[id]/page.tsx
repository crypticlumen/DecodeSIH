"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import { demoChargers } from "@/lib/demo-data";
import type { Charger, ConnectorType } from "@/lib/types";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReliabilityBadge from "@/components/ReliabilityBadge";
import ReliabilityExplanation from "@/components/ReliabilityExplanation";
import { cn } from "@/lib/utils";

const ChargeMap = dynamic(() => import("@/components/ChargeMap"), { ssr: false });

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DEFAULT_USER_LAT = 28.4595;
const DEFAULT_USER_LNG = 77.0266;

export default function ChargerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, selectedVehicle } = useAppStore();

  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [charger, setCharger] = useState<Charger | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const found = demoChargers.find((ch) => ch.id === id);
      setCharger(found ?? null);
      if (found) {
        setDistanceKm(
          Math.round(
            haversine(DEFAULT_USER_LAT, DEFAULT_USER_LNG, found.latitude, found.longitude) * 10
          ) / 10
        );
      }
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [id]);

  const compatibility = useMemo(() => {
    if (!charger || !selectedVehicle) return null;
    const vehicleConnectors = new Set(selectedVehicle.connectorTypes);
    const compatible: ConnectorType[] = [];
    const incompatible: ConnectorType[] = [];
    charger.connectorTypes.forEach((c) => {
      if (vehicleConnectors.has(c)) compatible.push(c);
      else incompatible.push(c);
    });
    return { compatible, incompatible, fullyCompatible: compatible.length > 0 };
  }, [charger, selectedVehicle]);

  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Icon name="User" className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">You are not logged in.</p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-60 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!charger) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Icon name="MapPin" className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">Charger not found</p>
        <p className="text-xs text-muted-foreground">
          The charger with ID &quot;{id}&quot; does not exist.
        </p>
        <Button onClick={() => router.push("/plan")}>Back to route planner</Button>
      </div>
    );
  }

  const statusConfig = {
    operational: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Operational" },
    maintenance: { color: "text-amber-400", bg: "bg-amber-500/10", label: "Under Maintenance" },
    offline: { color: "text-red-400", bg: "bg-red-500/10", label: "Offline" },
    coming_soon: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Coming Soon" },
  };

  const st = statusConfig[charger.operationalStatus];

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Title */}
      <div>
        <button
          onClick={() => router.push("/plan")}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 transition-colors"
        >
          <Icon name="ArrowLeft" className="w-3 h-3" />
          Back to route planner
        </button>
        <h1 className="text-xl font-bold text-foreground">{charger.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {charger.operator} · {charger.city}, {charger.state} · {charger.pincode}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Score + Info */}
        <div className="lg:col-span-1 space-y-5">
          {/* Reliability gauge card */}
          <div className="rounded-2xl border bg-card p-6 flex flex-col items-center">
            <ReliabilityBadge charger={charger} size="lg" showConfidence />
          </div>

          {/* Charger info card */}
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="Info" className="w-4 h-4 text-blue-400" />
              Station details
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-medium", st.color, st.bg)}>
                  {st.label}
                </span>
                {charger.verificationStatus === "verified" && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Icon name="BadgeCheck" className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium text-foreground">{charger.address}</p>
              </div>

              {distanceKm !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Distance from you</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    ~{distanceKm} km
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Power</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {charger.powerKw} kW
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {charger.currentType ?? "AC/DC"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    ₹{charger.pricePerKwh}/kWh
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Standard rate
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {charger.totalSessions ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Avg session</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {charger.avgSessionDurationMin ?? "—"} min
                  </p>
                </div>
              </div>

              {/* Connectors */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Connector types</p>
                <div className="flex flex-wrap gap-2">
                  {charger.connectorTypes.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      <Icon name="Plug" className="w-3 h-3" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Vehicle compatibility */}
              {selectedVehicle && compatibility && (
                <div
                  className={cn(
                    "rounded-lg p-3",
                    compatibility.fullyCompatible
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      compatibility.fullyCompatible ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {compatibility.fullyCompatible
                      ? `Compatible with your ${selectedVehicle.make} ${selectedVehicle.model}`
                      : "No compatible connectors found for your vehicle"}
                  </p>
                  {compatibility.compatible.length > 0 && (
                    <p className="text-[11px] text-emerald-400 mt-1">
                      Matching: {compatibility.compatible.join(", ")}
                    </p>
                  )}
                  {compatibility.incompatible.length > 0 && (
                    <p className="text-[11px] text-red-400 mt-0.5">
                      Incompatible: {compatibility.incompatible.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* Amenities */}
              {charger.amenities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {charger.amenities.map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-400 px-2.5 py-1 text-[11px] font-medium"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Operating hours */}
              {charger.operatingHours && (
                <div>
                  <p className="text-xs text-muted-foreground">Operating hours</p>
                  <p className="text-sm font-medium text-foreground">{charger.operatingHours}</p>
                </div>
              )}

              {/* Contact */}
              {charger.contactPhone && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium text-foreground">{charger.contactPhone}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button className="w-full gap-2">
                <Icon name="Calendar" className="w-4 h-4" />
                Book slot
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => router.push("/plan")}
              >
                <Icon name="ArrowLeft" className="w-4 h-4" />
                Back to route
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Map + Explanation */}
        <div className="lg:col-span-2 space-y-5">
          {/* Map card */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <ChargeMap
              chargers={[charger]}
              plannedChargerIds={charger.reliabilityScore >= 90 ? [charger.id] : []}
              backupChargerIds={charger.reliabilityScore < 90 ? [charger.id] : []}
              height="h-72"
              fitBounds
              showControls
            />
          </div>

          {/* Reliability Explanation */}
          <div className="rounded-2xl border bg-card p-6">
            <ReliabilityExplanation charger={charger} />
          </div>

          {/* Grid zone info */}
          {charger.gridZone && (
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Icon name="Globe" className="w-4 h-4 text-violet-400" />
                Grid zone
              </h3>
              <p className="text-sm text-foreground">{charger.gridZone}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Voltage: {charger.voltage ?? "—"} &middot; Last serviced:{" "}
                {new Date(charger.lastServiced).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

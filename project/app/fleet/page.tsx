"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";

import { useAppStore } from "@/lib/store";
import { demoVehicles, demoTrips } from "@/lib/demo-data";
import { getItem } from "@/lib/persistence";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import FleetOverview from "@/components/FleetOverview";
import FleetVehicleGrid from "@/components/FleetVehicleGrid";
import Icon from "@/components/Icon";

import type { Vehicle } from "@/lib/types";

/* =====================================================================
   Fleet Manager Dashboard — multi-vehicle monitoring & batch routing
   ===================================================================== */

const ChargeMap = dynamic(() => import("@/components/ChargeMap"), { ssr: false });

const USER_VEHICLES_KEY = "user_vehicles";

export default function FleetPage() {
  const router = useRouter();
  const { currentUser } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [fleetVehicles, setFleetVehicles] = useState<Vehicle[]>([]);

  /* ---- Role gate: redirect non-fleet_operator users ---- */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      if (currentUser.role !== "fleet_operator") {
        toast.error("Access restricted", {
          description: "Only fleet operators can access the fleet dashboard.",
        });
        router.replace("/dashboard");
        return;
      }

      // Load fleet vehicles
      const stored = getItem<Vehicle[]>(USER_VEHICLES_KEY, []);
      const demoForFleet = demoVehicles.filter((v) => {
        // Fleet demo vehicles: those belonging to fleet_operator demo user
        return v.userId === "usr_004";
      });
      const seen = new Set<string>();
      const merged: Vehicle[] = [];
      for (const v of [...demoForFleet, ...stored]) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          merged.push(v);
        }
      }
      setFleetVehicles(merged);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [currentUser, router]);

  /* ---- Active fleet trips ---- */
  const activeTrips = useMemo(() => {
    if (!currentUser) return 0;
    return demoTrips.filter(
      (t) => t.userId === currentUser.id && t.status === "active"
    ).length;
  }, [currentUser]);

  /* ---- Fleet vehicle positions for map ---- */
  const fleetPositions = useMemo(() => {
    return fleetVehicles.map((v) => ({
      lat: 12.9716 + (Math.random() - 0.5) * 0.08,
      lng: 77.5946 + (Math.random() - 0.5) * 0.08,
      label: `${v.make} ${v.model}`,
      type: v.type,
      reg: v.registrationNumber,
    }));
  }, [fleetVehicles]);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-4 w-96 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  /* ---- Not logged in ---- */
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
      {/* ---- Page Header ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Icon name="Truck" className="h-6 w-6 text-blue-400" />
            Fleet Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-vehicle monitoring, battery telemetry, and batch route planning
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push("/plan")}
        >
          <Icon name="Map" className="h-3.5 w-3.5" />
          Plan Batch Route
        </Button>
      </div>

      {/* ---- Fleet Overview Stats ---- */}
      <FleetOverview vehicles={fleetVehicles} activeTrips={activeTrips} />

      {/* ---- Fleet Map Panel ---- */}
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon name="MapPin" className="h-4 w-4 text-blue-400" />
          Fleet Vehicle Locations
        </h2>

        {fleetVehicles.length === 0 ? (
          <Alert variant="default" className="border border-dashed">
            <Icon name="Info" className="h-4 w-4 text-muted-foreground" />
            <AlertTitle>No vehicles to display</AlertTitle>
            <AlertDescription>
              Register vehicles to see them on the fleet map.
            </AlertDescription>
          </Alert>
        ) : (
          <ChargeMap
            height="h-[350px]"
            center={[12.9716, 77.5946]}
            zoom={11}
            showControls
            fitBounds={false}
          />
        )}

        {/* Fleet position pins legend */}
        {fleetPositions.length > 0 && (
          <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-2">
            {fleetPositions.map((pos, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    pos.type === "2W"
                      ? "bg-sky-500"
                      : pos.type === "3W"
                      ? "bg-emerald-500"
                      : "bg-violet-500"
                  }`}
                />
                <span className="text-foreground font-medium">{pos.reg}</span>
                <span className="text-muted-foreground">{pos.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground italic">
              Simulated positions
            </span>
          </div>
        )}
      </div>

      {/* ---- Fleet Vehicle Grid ---- */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon name="LayoutGrid" className="h-4 w-4 text-blue-400" />
          All Fleet Vehicles
        </h2>
        <FleetVehicleGrid vehicles={fleetVehicles} />
      </div>
    </div>
  );
}
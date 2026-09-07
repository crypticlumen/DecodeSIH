"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { demoVehicles } from "@/lib/demo-data";
import { getItem } from "@/lib/persistence";
import type { Vehicle, Charger } from "@/lib/types";
import type { RouteResult } from "@/lib/routing";
import type { RouteSegment, MapWaypoint } from "@/components/ChargeMap";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import RoutePlanner from "@/components/RoutePlanner";
import RouteResultComponent from "@/components/RouteResult";

const ChargeMap = dynamic(() => import("@/components/ChargeMap"), { ssr: false });

const USER_VEHICLES_KEY = "user_vehicles";

export default function PlanPage() {
  const router = useRouter();
  const { currentUser, selectedVehicle, setSelectedVehicle } = useAppStore();

  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentUser) {
        setLoading(false);
        setHydrated(true);
        return;
      }
      const stored = getItem<Vehicle[]>(USER_VEHICLES_KEY, []);
      const demoForUser = demoVehicles.filter((v) => v.userId === currentUser.id);
      const seen = new Set<string>();
      const merged: Vehicle[] = [];
      for (const v of [...demoForUser, ...stored]) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          merged.push(v);
        }
      }
      setUserVehicles(merged);

      if (selectedVehicle) {
        const belongsToUser = merged.some((v) => v.id === selectedVehicle.id);
        if (!belongsToUser) {
          setSelectedVehicle(merged.length > 0 ? merged[0] : null);
        }
      } else if (merged.length > 0) {
        setSelectedVehicle(merged[0]);
      }

      setLoading(false);
      setHydrated(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentUser]);

  /* ---- Vehicle guard: redirect if no vehicle is selected ---- */
  useEffect(() => {
    if (hydrated && !loading && currentUser && !selectedVehicle && userVehicles.length === 0) {
      toast.warning("No vehicles found", {
        description: "Please add a vehicle before planning a route.",
      });
      router.replace("/vehicles");
    }
  }, [hydrated, loading, currentUser, selectedVehicle, userVehicles, router]);

  const handleRouteResult = (result: RouteResult) => {
    setRouteResult(result);
  };

  // Build ChargeMap props from route result
  const mapChargers = useMemo((): Charger[] => {
    if (!routeResult) return [];
    const all: Charger[] = [];
    routeResult.primaryStops.forEach((s) => all.push(s.charger));
    routeResult.backupStops.forEach((s) => all.push(s.charger));
    return all;
  }, [routeResult]);

  const plannedIds = useMemo(() => {
    if (!routeResult) return [];
    return routeResult.primaryStops.map((s) => s.charger.id);
  }, [routeResult]);

  const backupIds = useMemo(() => {
    if (!routeResult) return [];
    return routeResult.backupStops.map((s) => s.charger.id);
  }, [routeResult]);

  const mapWaypoints = useMemo((): MapWaypoint[] => {
    if (!routeResult) return [];
    const poly = routeResult.routePolyline;
    if (poly.length < 2) return [];
    const waypoints: MapWaypoint[] = [
      {
        lat: poly[0][0],
        lng: poly[0][1],
        label: routeResult.startAddress,
        type: "origin",
      },
      {
        lat: poly[poly.length - 1][0],
        lng: poly[poly.length - 1][1],
        label: routeResult.endAddress,
        type: "destination",
      },
    ];

    // Append primary stops as charge_stop waypoints with sequential index
    routeResult.primaryStops.forEach((stop, idx) => {
      waypoints.push({
        lat: stop.charger.latitude,
        lng: stop.charger.longitude,
        label: `Stop ${idx + 1}: ${stop.charger.name}`,
        type: "charge_stop",
        index: idx + 1,
      });
    });

    return waypoints;
  }, [routeResult]);

  const mapRoutes = useMemo((): RouteSegment[] => {
    if (!routeResult) return [];
    return [
      {
        vertices: routeResult.routePolyline,
        color: "#2563eb",
        weight: 4,
        dashArray: "",
      },
    ];
  }, [routeResult]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Plan Route</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Range-aware charging stops with backup recommendations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: form + result */}
          <div className="lg:col-span-1 space-y-5">
            <RoutePlanner
              vehicle={selectedVehicle}
              vehicles={userVehicles}
              onResult={handleRouteResult}
              loading={calculating}
              setLoading={setCalculating}
            />

            {calculating && (
              <div className="rounded-2xl border bg-card p-5 space-y-3">
                <Skeleton className="h-6 w-40" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            )}

            {routeResult && !calculating && (
              <RouteResultComponent result={routeResult} />
            )}
          </div>

          {/* Right panel: map */}
          <div className="lg:col-span-2">
            {routeResult ? (
              <ChargeMap
                chargers={mapChargers}
                plannedChargerIds={plannedIds}
                backupChargerIds={backupIds}
                waypoints={mapWaypoints}
                routes={mapRoutes}
                height="h-[500px] lg:h-[calc(100vh-12rem)]"
                fitBounds
                showControls
              />
            ) : (
              <ChargeMap
                chargers={[]}
                height="h-[500px] lg:h-[calc(100vh-12rem)]"
                fitBounds={false}
                showControls
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

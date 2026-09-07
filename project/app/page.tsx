"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import VehicleStatusCard from "@/components/VehicleStatusCard";
import NearbyChargers from "@/components/NearbyChargers";
import RecentTrips from "@/components/RecentTrips";
import { ChargerFilters, ChargerFiltersState } from "@/components/ChargerFilters";
import Icon from "@/components/Icon";
import { useAppStore } from "@/lib/store";
import { demoVehicles, demoChargers, demoTrips } from "@/lib/demo-data";
import type { Vehicle, Charger } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const quickRoutes = [
  { label: "Office", address: "Gurugram Sector 29", lat: 28.47, lng: 77.07 },
  { label: "Airport", address: "IGI Airport T3", lat: 28.556, lng: 77.1 },
  { label: "Home", address: "DLF Phase 2", lat: 28.4595, lng: 77.0266 },
  { label: "Mall", address: "Ambience Mall, Gurugram", lat: 28.505, lng: 77.097 },
];

const ChargeMap = dynamic(() => import("@/components/ChargeMap"), {
  ssr: false,
});

function deriveAllOperators(chargers: Charger[]): string[] {
  const set = new Set<string>();
  chargers.forEach((c) => set.add(c.operator));
  return Array.from(set).sort();
}

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, selectedVehicle, setSelectedVehicle } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [userTrips, setUserTrips] = useState<typeof demoTrips>([]);

  // User location with fallback (Gurugram)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 28.4595,
    lng: 77.0266,
  });

  // Filtering state
  const [filters, setFilters] = useState<ChargerFiltersState>({
    search: "",
    operators: [],
    connectorTypes: [],
    availableOnly: false,
    minReliability: 0,
  });

  // Map focus state
  const [focusedChargerId, setFocusedChargerId] = useState<string | null>(null);

  const userVehicles = useMemo(() => {
    if (!currentUser) return [];
    return demoVehicles.filter((v) => v.userId === currentUser.id);
  }, [currentUser]);

  const allOperators = useMemo(() => deriveAllOperators(demoChargers), []);

  const filteredChargers = useMemo(() => {
    return demoChargers.filter((c) => {
      // Text search on name and city
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const nameMatch = c.name.toLowerCase().includes(q);
        const cityMatch = c.city.toLowerCase().includes(q);
        if (!nameMatch && !cityMatch) return false;
      }

      // Operator filter
      if (filters.operators.length > 0 && !filters.operators.includes(c.operator)) {
        return false;
      }

      // Connector type filter — charger must have at least one of the selected types
      if (filters.connectorTypes.length > 0) {
        const hasMatching = c.connectorTypes.some((ct) =>
          filters.connectorTypes.includes(ct)
        );
        if (!hasMatching) return false;
      }

      // Availability filter
      if (filters.availableOnly && !c.isAvailable) return false;

      // Reliability minimum
      if (c.reliabilityScore < filters.minReliability) return false;

      return true;
    });
  }, [filters]);

  // Simulate async loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser) {
        setUserTrips(demoTrips.filter((t) => t.userId === currentUser.id));
      }
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [currentUser]);

  // Auto-select first vehicle on load
  useEffect(() => {
    if (!selectedVehicle && userVehicles.length > 0) {
      setSelectedVehicle(userVehicles[0]);
    }
  }, [selectedVehicle, userVehicles, setSelectedVehicle]);

  // Browser geolocation
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Silently retain fallback on error/denial
        }
      );
    }
  }, []);

  const handleQuickRoute = (route: (typeof quickRoutes)[0]) => {
    router.push("/route-planner");
  };

  const handleChargerClick = useCallback((id: string) => {
    setFocusedChargerId(id);
    const el = document.getElementById("charging-network");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Icon name="User" className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          You are not logged in.
        </p>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Welcome back, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here is your EV dashboard overview.
          </p>
        </div>
        {userVehicles.length > 1 && (
          <div className="hidden sm:flex items-center gap-2">
            {userVehicles.map((v: Vehicle) => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                  ${
                    selectedVehicle?.id === v.id
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }
                `}
              >
                {v.make} {v.model}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vehicle Status + Nearby Chargers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="Battery" className="w-4 h-4 text-emerald-400" />
            Vehicle Status
          </h2>
          {loading ? (
            <Skeleton className="h-56 rounded-2xl" />
          ) : (
            <VehicleStatusCard vehicle={selectedVehicle} />
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Icon name="MapPin" className="w-4 h-4 text-blue-400" />
            Nearby Chargers
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <NearbyChargers
              chargers={filteredChargers}
              userLat={userLocation.lat}
              userLng={userLocation.lng}
              limit={5}
              onChargerClick={handleChargerClick}
              activeChargerId={focusedChargerId ?? undefined}
            />
          )}
        </div>
      </div>

      {/* Charger Filters */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="ListFilter" className="w-4 h-4 text-orange-400" />
          Filter Chargers
        </h2>
        <ChargerFilters
          operators={allOperators}
          value={filters}
          onChange={setFilters}
        />
      </div>

      {/* Charging Network */}
      <div id="charging-network">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="Map" className="w-4 h-4 text-blue-400" />
          Charging Network
        </h2>
        {loading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : (
          <ChargeMap
            chargers={filteredChargers}
            height="h-96"
            fitBounds
            showControls
            focusedChargerId={focusedChargerId ?? undefined}
            center={[userLocation.lat, userLocation.lng]}
          />
        )}
      </div>

      {/* Quick Route Shortcuts */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="Navigation" className="w-4 h-4 text-violet-400" />
          Quick Routes
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickRoutes.map((route) => (
            <button
              key={route.label}
              onClick={() => handleQuickRoute(route)}
              className="relative overflow-hidden rounded-xl border bg-card p-4 text-left hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                  <Icon name="MapPin" className="w-4.5 h-4.5 text-violet-400" />
                </div>
                <Icon
                  name="ArrowRight"
                  className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {route.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {route.address}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Trips */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Icon name="Route" className="w-4 h-4 text-amber-400" />
          Recent Trips
        </h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <RecentTrips trips={userTrips} />
        )}
      </div>
    </div>
  );
}

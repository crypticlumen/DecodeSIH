"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { demoChargers, demoBookings, demoVehicles, demoTrips } from "@/lib/demo-data";
import { getItem, setItem } from "@/lib/persistence";
import type { Booking, Charger, Vehicle, Trip } from "@/lib/types";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SlotPicker from "@/components/SlotPicker";
import BookingConfirmation from "@/components/BookingConfirmation";
import TripHistory from "@/components/TripHistory";

const BOOKINGS_KEY = "user_bookings";
const TRIPS_KEY = "user_trips";

interface Slot {
  id: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  available: boolean;
  recommended: boolean;
  priceMultiplier: number;
  label: string;
}

export default function BookingsPage() {
  const router = useRouter();
  const { currentUser, selectedVehicle } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "bookings" | "history">("book");

  // Booking state
  const [selectedChargerId, setSelectedChargerId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  // Load data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentUser) {
        setLoading(false);
        setHydrated(true);
        return;
      }

      const storedBookings = getItem<Booking[]>(BOOKINGS_KEY, []);
      const storedTrips = getItem<Trip[]>(TRIPS_KEY, []);

      const demoB = demoBookings.filter((b) => b.userId === currentUser.id);
      const demoT = demoTrips.filter((t) => t.userId === currentUser.id);

      const seenB = new Set<string>();
      const mergedBookings: Booking[] = [];
      for (const b of [...demoB, ...storedBookings]) {
        if (!seenB.has(b.id)) { seenB.add(b.id); mergedBookings.push(b); }
      }

      const seenT = new Set<string>();
      const mergedTrips: Trip[] = [];
      for (const t of [...demoT, ...storedTrips]) {
        if (!seenT.has(t.id)) { seenT.add(t.id); mergedTrips.push(t); }
      }

      setBookings(mergedBookings);
      setTrips(mergedTrips);
      setLoading(false);
      setHydrated(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [currentUser]);

  const userVehicles = useMemo(() => {
    if (!currentUser) return [];
    const seen = new Set<string>();
    const merged: Vehicle[] = [];
    const stored = getItem<Vehicle[]>("user_vehicles", []);
    for (const v of [...demoVehicles.filter((d) => d.userId === currentUser.id), ...stored]) {
      if (!seen.has(v.id)) { seen.add(v.id); merged.push(v); }
    }
    return merged;
  }, [currentUser]);

  /* ---- Vehicle guard: redirect if no vehicle is available ---- */
  useEffect(() => {
    if (hydrated && !loading && currentUser && !selectedVehicle && userVehicles.length === 0) {
      toast.warning("No vehicles found", {
        description: "Please add a vehicle before managing bookings.",
      });
      router.replace("/vehicles");
    }
  }, [hydrated, loading, currentUser, selectedVehicle, userVehicles, router]);

  const chargerMap = useMemo(() => {
    return new Map(demoChargers.map((c) => [c.id, c]));
  }, []);

  const chargerNames = useMemo(() => {
    return new Map(demoChargers.map((c) => [c.id, c.name]));
  }, []);

  const activeVehicle = selectedVehicle ?? (userVehicles.length > 0 ? userVehicles[0] : null);
  const selectedCharger = selectedChargerId ? chargerMap.get(selectedChargerId) ?? null : null;

  const persistBookings = useCallback((updated: Booking[]) => {
    const nonDemo = updated.filter((b) => !demoBookings.some((d) => d.id === b.id));
    setItem(BOOKINGS_KEY, nonDemo);
    setBookings(updated);
  }, []);

  const persistTrips = useCallback((updated: Trip[]) => {
    const nonDemo = updated.filter((t) => !demoTrips.some((d) => d.id === t.id));
    setItem(TRIPS_KEY, nonDemo);
    setTrips(updated);
  }, []);

  const handleBookSlot = () => {
    if (!currentUser || !selectedCharger || !activeVehicle || !selectedSlot) return;

    const today = new Date();
    today.setDate(today.getDate());
    const startDate = new Date(today);
    startDate.setHours(selectedSlot.startHour, selectedSlot.startMin, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(selectedSlot.endHour, selectedSlot.endMin, 0, 0);

    const durationHours = selectedSlot.endHour - selectedSlot.startHour;
    const energyKwh = Math.min(
      activeVehicle.batteryCapacityKwh * ((100 - (activeVehicle.currentSoC ?? 50)) / 100),
      selectedCharger.powerKw * durationHours
    );
    const cost = energyKwh * selectedCharger.pricePerKwh * selectedSlot.priceMultiplier;

    const newBooking: Booking = {
      id: `bk_${Date.now()}`,
      userId: currentUser.id,
      chargerId: selectedCharger.id,
      vehicleId: activeVehicle.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      status: "confirmed",
      energyRequestedKwh: Math.round(energyKwh * 10) / 10,
      estimatedCost: Math.round(cost),
      paymentStatus: "paid",
      paymentMethod: "upi",
      createdAt: new Date().toISOString(),
    };

    persistBookings([newBooking, ...bookings]);
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedSlot(null);
      setActiveTab("bookings");
    }, 2000);
  };

  const handleCancelBooking = (bookingId: string) => {
    const updated = bookings.map((b) =>
      b.id === bookingId ? { ...b, status: "cancelled" as const } : b
    );
    persistBookings(updated);
  };

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
          <h1 className="text-xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reserve charging slots and track your trip history.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-muted p-1 w-fit">
        {([
          ["book", "Book slot", "Calendar"],
          ["bookings", "My bookings", "List"],
          ["history", "Trip history", "Route"],
        ] as const).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${activeTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}
            `}
          >
            <Icon name={icon as any} className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ========== BOOK SLOT TAB ========== */}
          {activeTab === "book" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {/* Charger selector */}
                <div className="mb-4">
                  <Select
                    value={selectedChargerId}
                    onValueChange={(value: string | null) => {
                      if (value) {
                        setSelectedChargerId(value);
                        setSelectedSlot(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a charger to book…" />
                    </SelectTrigger>
                    <SelectContent>
                      {demoChargers
                        .filter((c) => c.operationalStatus === "operational" || c.operationalStatus === "maintenance")
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} · {c.city}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCharger && (
                  <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <Icon name="Zap" className="w-4 h-4 text-violet-400" />
                      </div>
                      <h2 className="text-base font-semibold text-foreground">{selectedCharger.name}</h2>
                    </div>
                    <SlotPicker
                      charger={selectedCharger}
                      vehicle={activeVehicle}
                      onSelect={setSelectedSlot}
                      selectedSlot={selectedSlot}
                    />
                  </div>
                )}
              </div>

              {/* Sidebar: booking summary + confirm */}
              <div className="space-y-4">
                {selectedCharger && selectedSlot ? (
                  <>
                    <div className="rounded-2xl border bg-card p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Icon name="ClipboardList" className="w-4 h-4 text-blue-400" />
                        Booking summary
                      </h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Charger</span>
                          <span className="font-medium text-foreground truncate max-w-[180px]">
                            {selectedCharger.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vehicle</span>
                          <span className="font-medium text-foreground">
                            {activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Slot</span>
                          <span className="font-medium text-foreground">
                            {selectedSlot.label}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price</span>
                          <span className="font-medium text-foreground">
                            ₹{(selectedCharger.pricePerKwh * selectedSlot.priceMultiplier).toFixed(1)}/kWh
                          </span>
                        </div>
                        {selectedSlot.recommended && (
                          <div className="rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-400 flex items-center gap-2">
                            <Icon name="Zap" className="w-3.5 h-3.5" />
                            Grid-optimal time slot — lower price & higher renewable mix.
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={handleBookSlot}
                    >
                      <Icon name="Check" className="w-4 h-4" />
                      Confirm booking
                    </Button>
                  </>
                ) : (
                  <div className="rounded-2xl border bg-card p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Icon name="Calendar" className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {!selectedCharger ? "Select a charger" : "Pick a time slot"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {!selectedCharger
                        ? "Choose a charger above to see available time slots."
                        : "Tap an available slot above to continue booking."}
                    </p>
                  </div>
                )}

                {/* Success toast */}
                {bookingSuccess && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 flex flex-col items-center gap-2 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Icon name="CheckCircle2" className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-emerald-400">Booking confirmed!</p>
                    <p className="text-xs text-emerald-400">Redirecting to your bookings…</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== MY BOOKINGS TAB ========== */}
          {activeTab === "bookings" && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="rounded-2xl border bg-card p-10 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <Icon name="Calendar" className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No bookings yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Book a charging slot to see your reservations here.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("book")}>
                    Book a slot
                  </Button>
                </div>
              ) : (
                [...bookings]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((booking) => {
                    const charger = chargerMap.get(booking.chargerId);
                    const vh = [...userVehicles, ...demoVehicles].find((v) => v.id === booking.vehicleId);
                    if (!charger || !vh) return null;
                    return (
                      <BookingConfirmation
                        key={booking.id}
                        booking={booking}
                        charger={charger}
                        vehicle={vh}
                        onCancel={handleCancelBooking}
                      />
                    );
                  })
              )}
            </div>
          )}

          {/* ========== TRIP HISTORY TAB ========== */}
          {activeTab === "history" && (
            <TripHistory
              trips={trips}
              vehicles={userVehicles}
              chargerNames={chargerNames}
            />
          )}
        </>
      )}
    </div>
  );
}

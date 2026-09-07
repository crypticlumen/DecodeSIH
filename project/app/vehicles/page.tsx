"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { demoVehicles } from "@/lib/demo-data";
import { getItem, setItem } from "@/lib/persistence";
import type { Vehicle } from "@/lib/types";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import VehicleForm from "@/components/VehicleForm";
import VehicleList from "@/components/VehicleList";

const USER_VEHICLES_KEY = "user_vehicles";

export default function VehiclesPage() {
  const router = useRouter();
  const { currentUser, selectedVehicle, setSelectedVehicle } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Load vehicles on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = getItem<Vehicle[]>(USER_VEHICLES_KEY, []);
      const demoForUser = currentUser
        ? demoVehicles.filter((v) => v.userId === currentUser.id)
        : [];
      // Merge demo + stored, deduplicate by id
      const seen = new Set<string>();
      const merged: Vehicle[] = [];
      for (const v of [...demoForUser, ...stored]) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          merged.push(v);
        }
      }
      setAllVehicles(merged);
      if (merged.length > 0 && !selectedVehicle) {
        setSelectedVehicle(merged[0]);
      }
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Persist user vehicles whenever they change
  const persistVehicles = useCallback((vehicles: Vehicle[]) => {
    const existing = getItem<Vehicle[]>(USER_VEHICLES_KEY, []);
    const nonDemo = vehicles.filter((v) => !demoVehicles.some((d) => d.id === v.id));
    setItem(USER_VEHICLES_KEY, nonDemo);
  }, []);

  const handleSave = (
    data: Omit<Vehicle, "id" | "createdAt"> & { id?: string; createdAt?: string }
  ) => {
    if (editingVehicle) {
      // Update existing
      const updated = allVehicles.map((v) =>
        v.id === editingVehicle.id
          ? { ...v, ...data, id: v.id, userId: v.userId, createdAt: v.createdAt }
          : v
      );
      setAllVehicles(updated);
      persistVehicles(updated);
      if (selectedVehicle?.id === editingVehicle.id) {
        setSelectedVehicle(updated.find((v) => v.id === editingVehicle.id) ?? null);
      }
    } else {
      // Create new — destructure userId so it does not appear twice
      const { userId: _, id: _id, createdAt: _createdAt, ...rest } = data;
      const newVehicle: Vehicle = {
        ...rest,
        id: `vh_${Date.now()}`,
        userId: currentUser?.id ?? "",
        createdAt: new Date().toISOString(),
      };
      const updated = [...allVehicles, newVehicle];
      setAllVehicles(updated);
      persistVehicles(updated);
      if (updated.length === 1) {
        setSelectedVehicle(newVehicle);
      }
    }
    setFormOpen(false);
    setEditingVehicle(null);
  };

  const handleDelete = (vehicleId: string) => {
    const updated = allVehicles.filter((v) => v.id !== vehicleId);
    setAllVehicles(updated);
    persistVehicles(updated);
    if (selectedVehicle?.id === vehicleId) {
      setSelectedVehicle(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormOpen(true);
  };

  const openAddForm = () => {
    setEditingVehicle(null);
    setFormOpen(true);
  };

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your EV fleet and track battery health.
          </p>
        </div>
        <Button onClick={openAddForm} className="gap-2">
          <Icon name="Plus" className="w-4 h-4" />
          Add vehicle
        </Button>
      </div>

      {/* Vehicle grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <VehicleList
          vehicles={allVehicles}
          selectedId={selectedVehicle?.id ?? null}
          onSelect={handleSelect}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Active vehicle info banner */}
      {!loading && selectedVehicle && allVehicles.length > 0 && (
        <div className="rounded-2xl border bg-emerald-500/10 p-5 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Icon name="Zap" className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-400">
              {selectedVehicle.make} {selectedVehicle.model} is active
            </p>
            <p className="text-xs text-emerald-400 mt-0.5">
              Your dashboard, route planner, and bookings will use this vehicle by default.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15"
            onClick={() => router.push("/")}
          >
            View dashboard
          </Button>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormOpen(false);
            setEditingVehicle(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? (
                <span className="flex items-center gap-2">
                  <Icon name="Pencil" className="w-5 h-5" />
                  Edit {editingVehicle.make} {editingVehicle.model}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Icon name="PlusCircle" className="w-5 h-5" />
                  Add new vehicle
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? "Update the details of your vehicle below."
                : "Register a new EV to start tracking and planning routes."}
            </DialogDescription>
          </DialogHeader>
          <VehicleForm
            existing={editingVehicle}
            onSave={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditingVehicle(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

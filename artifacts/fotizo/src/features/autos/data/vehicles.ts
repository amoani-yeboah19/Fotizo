import type { LucideIcon } from "lucide-react";
import { Fuel, BatteryCharging, Leaf } from "lucide-react";

// Fotizo Autos — vehicles sourced worldwide and shipped to the customer's
// country. The catalogue lives in the database (GET /api/vehicles); staff
// publish reviewed vehicles, and scripts/src/import-vehicles.ts loads a
// reviewed JSON catalogue. This module holds only the shape and display helpers.
//
// Deliberately NOT modelled as a ShopProduct: a car has a drivetrain, a lead
// time and a landed price that moves with duty and the exchange rate, not a
// "sold" count or free-shipping flag.

export type FuelType = "petrol" | "hybrid" | "electric";
export type BodyType = "suv" | "coupe-suv" | "sedan" | "pickup";

export interface Vehicle {
  id: string;
  /** URL identifier, e.g. "byd-atto-3". */
  slug: string;
  make: string;
  model: string;
  bodyType: BodyType;
  fuel: FuelType;
  seats: number;
  transmission: string;
  drivetrain: string;
  /** Engine or motor summary, e.g. "1.5L turbo petrol". */
  powertrain: string;
  /** Range for EVs, fuel economy for combustion — whichever the buyer asks about. */
  efficiency: string;
  /**
   * Indicative landed price in GBP — the vehicle plus sea freight, before the
   * destination country's duty and taxes. The binding figure is given per
   * enquiry, once the destination port and spec are known.
   */
  landedPrice: number;
  /** Typical order-to-handover window in weeks, inclusive. */
  leadTimeWeeks: [number, number];
  image: string;
  images: string[];
  /** Three or four short selling points for the card and detail header. */
  highlights: string[];
  description: string;
  status: "active" | "unpublished";
}

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: "Petrol",
  hybrid: "Hybrid",
  electric: "Electric",
};

export const FUEL_ICONS: Record<FuelType, LucideIcon> = {
  petrol: Fuel,
  hybrid: Leaf,
  electric: BatteryCharging,
};

// Menu order for the filter rail. Types with no vehicle behind them are hidden
// at render time, so customers never get a chip that returns nothing.
export const BODY_LABELS: Record<BodyType, string> = {
  suv: "SUV",
  "coupe-suv": "Coupe SUV",
  sedan: "Sedan",
  pickup: "Pickup",
};

export function vehicleName(v: Vehicle): string {
  return `${v.make} ${v.model}`;
}

export function leadTimeLabel(v: Vehicle): string {
  const [min, max] = v.leadTimeWeeks;
  return `${min}–${max} weeks`;
}

/** Makes present in the catalogue, for the filter rail. */
export function vehicleMakes(vehicles: Vehicle[]): string[] {
  return [...new Set(vehicles.map((v) => v.make))].sort();
}

export function vehicleBodyTypes(vehicles: Vehicle[]): BodyType[] {
  const present = new Set(vehicles.map((v) => v.bodyType));
  return (Object.keys(BODY_LABELS) as BodyType[]).filter((b) => present.has(b));
}

export function vehicleFuelTypes(vehicles: Vehicle[]): FuelType[] {
  const present = new Set(vehicles.map((v) => v.fuel));
  return (Object.keys(FUEL_LABELS) as FuelType[]).filter((f) => present.has(f));
}

export function relatedVehicles(vehicle: Vehicle, vehicles: Vehicle[], limit = 3): Vehicle[] {
  // Same body style first, then anything else — a coupe-SUV shopper is rarely
  // cross-shopping a seven-seater.
  const others = vehicles.filter((v) => v.id !== vehicle.id);
  const sameBody = others.filter((v) => v.bodyType === vehicle.bodyType);
  const rest = others.filter((v) => v.bodyType !== vehicle.bodyType);
  return [...sameBody, ...rest].slice(0, limit);
}

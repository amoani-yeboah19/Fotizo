import type { LucideIcon } from "lucide-react";
import { Fuel, BatteryCharging, Leaf } from "lucide-react";

// Fotizo Autos — Chinese vehicles imported to order through the Guangzhou hub.
//
// Deliberately NOT modelled as a ShopProduct. A car has no "sold" count worth
// showing, no "almost gone" urgency badge, and no free-shipping flag; it has a
// drivetrain, a lead time and a landed price that moves with duty and the
// exchange rate. Squeezing that into the parcel catalog produced nonsense like
// `sold: 24` on a £52,000 SUV, which is why this lives in its own feature.
//
// Photos are Wikimedia Commons stand-ins, not dealer photography — swap them
// before launch. Credits (required by the BY-SA licences):
//   changan-cs75:    "Changan CS75 Plus III 002" / "IV 001" / "IV 002" (CC0)
//   changan-uni-t:   "Changan UNI-T 005" / "006" (CC BY-SA 4.0) — https://commons.wikimedia.org/wiki/File:Changan_UNI-T_005.jpg
//   jetour-x70:      "Jetour X70 001" / "006" / "007" (CC BY-SA 4.0) — https://commons.wikimedia.org/wiki/File:Jetour_X70_001.jpg
//   jetour-x70-coupe:"Jetour X70 Coupe facelift 001" / "002" (CC BY-SA 4.0) — https://commons.wikimedia.org/wiki/File:Jetour_X70_Coupe_facelift_001.jpg
//   jetour-dashing:  "Jetour Dashing 006" / "007" / "008" (CC0)
//   avatr-11:        "AVATR 11 002/004/006/007" by JustAnotherCarDesigner (CC BY-SA 4.0) — https://commons.wikimedia.org/wiki/File:AVATR_11_002.jpg

export type FuelType = "petrol" | "hybrid" | "electric";
export type BodyType = "suv" | "coupe-suv";

export interface Vehicle {
  id: string;
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
   * Landed-Accra estimate in the app's base currency (GBP), freight and duty
   * included. Indicative only: the binding figure is quoted per enquiry because
   * duty moves with the exchange rate and the customer's chosen spec.
   */
  landedPrice: number;
  /** Typical order-to-handover window in weeks, inclusive. */
  leadTimeWeeks: [number, number];
  image: string;
  images: string[];
  /** Three or four short selling points for the card and detail header. */
  highlights: string[];
  description: string;
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

export const BODY_LABELS: Record<BodyType, string> = {
  suv: "SUV",
  "coupe-suv": "Coupe SUV",
};

export const VEHICLES: Vehicle[] = [
  {
    id: "jetour-x70",
    make: "Jetour",
    model: "X70",
    bodyType: "suv",
    fuel: "petrol",
    seats: 7,
    transmission: "6-speed automatic",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L turbo petrol",
    efficiency: "≈ 7.8 L/100km combined",
    landedPrice: 19600,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/7/78/Jetour_X70_001.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/7/78/Jetour_X70_001.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/4/4f/Jetour_X70_006.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/cb/Jetour_X70_007.jpg",
    ],
    highlights: ["Seven seats", "High ground clearance", "Best value in the range"],
    description:
      "Jetour's seven-seat workhorse and the volume seller of the range — three rows, a high driving position and a usable boot with the third row folded. The suspension is tuned soft, which suits Ghanaian road surfaces, and the 1.5L turbo is the cheapest engine in this list to run and to service. The default choice for family or fleet buyers.",
  },
  {
    id: "jetour-dashing",
    make: "Jetour",
    model: "Dashing",
    bodyType: "suv",
    fuel: "petrol",
    seats: 5,
    transmission: "7-speed dual-clutch",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L turbo petrol",
    efficiency: "≈ 7.4 L/100km combined",
    landedPrice: 20900,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/1/17/Jetour_Dashing_006.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/1/17/Jetour_Dashing_006.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/09/Jetour_Dashing_007.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Jetour_Dashing_008.jpg",
    ],
    highlights: ["Compact footprint", "Split-lighting front end", "Easy in city traffic"],
    description:
      "The Dashing is Jetour's sharper-styled compact SUV — split lighting, a wide grille and a dual-clutch gearbox, pitched at younger urban buyers. Smaller than the X70 and noticeably easier to park and thread through Accra traffic, without giving up the raised seating position.",
  },
  {
    id: "changan-uni-t",
    make: "Changan",
    model: "UNI-T",
    bodyType: "coupe-suv",
    fuel: "petrol",
    seats: 5,
    transmission: "7-speed dual-clutch",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L turbo petrol",
    efficiency: "≈ 7.6 L/100km combined",
    landedPrice: 21800,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/e/ec/Changan_UNI-T_005.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/Changan_UNI-T_005.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/9/98/Changan_UNI-T_006.jpg",
    ],
    highlights: ["Grille-less face", "Coupe roofline", "Strongest styling in the range"],
    description:
      "The UNI-T is Changan's design-led compact SUV — a grille-less front end, hidden exhausts and a coupe roofline, aimed at buyers who want a car that looks expensive without an executive price tag. Mechanically it shares the well-proven 1.5L turbo used across Changan's range, so parts and servicing stay straightforward.",
  },
  {
    id: "jetour-x70-coupe",
    make: "Jetour",
    model: "X70 Coupe",
    bodyType: "coupe-suv",
    fuel: "petrol",
    seats: 5,
    transmission: "7-speed dual-clutch",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L turbo petrol",
    efficiency: "≈ 7.9 L/100km combined",
    landedPrice: 22300,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/4/46/Jetour_X70_Coupe_facelift_001.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/4/46/Jetour_X70_Coupe_facelift_001.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/30/Jetour_X70_Coupe_facelift_002.jpg",
    ],
    highlights: ["Facelifted styling", "Five seats", "Same platform as the X70"],
    description:
      "The coupe-roofline take on the X70, facelifted — the same turbocharged platform and cabin technology in a sleeker five-seat body, for buyers who want the X70's mechanicals and running costs but never use the third row. Boot space is close to the standard car with the rear seats up.",
  },
  {
    id: "changan-cs75",
    make: "Changan",
    model: "CS75 PLUS",
    bodyType: "suv",
    fuel: "petrol",
    seats: 5,
    transmission: "8-speed automatic",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L / 2.0L turbo petrol",
    efficiency: "≈ 8.1 L/100km combined",
    landedPrice: 23400,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Changan_CS75_Plus_III_002.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/c/c8/Changan_CS75_Plus_III_002.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/2/2f/Changan_CS75_Plus_IV_001.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/a/ac/Changan_CS75_Plus_IV_002.jpg",
    ],
    highlights: ["Changan's best seller", "2.0L option available", "Large touchscreen cabin"],
    description:
      "Changan's best-selling mid-size SUV and the most conventional pick here — a roomy five-seater with a large twin-screen dashboard, reversing camera and a driver-assist package as standard. The 2.0L turbo is worth specifying if the car will be loaded or towing; the 1.5L is the economical choice for city use.",
  },
  {
    id: "avatr-11",
    make: "Avatr",
    model: "11",
    bodyType: "coupe-suv",
    fuel: "electric",
    seats: 5,
    transmission: "Single-speed",
    drivetrain: "Dual-motor all-wheel drive",
    powertrain: "Dual electric motors",
    efficiency: "≈ 600 km CLTC range",
    landedPrice: 52500,
    leadTimeWeeks: [12, 16],
    image: "https://upload.wikimedia.org/wikipedia/commons/c/ce/AVATR_11_002.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/c/ce/AVATR_11_002.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f2/AVATR_11_004.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/cf/AVATR_11_006.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/5/55/AVATR_11_007.jpg",
    ],
    highlights: ["Changan × CATL × Huawei", "Dual-motor AWD", "Huawei cabin & driver assist"],
    description:
      "Avatr is the premium electric marque built by Changan together with CATL and Huawei. The 11 is its flagship — a dual-motor all-wheel-drive fastback SUV with a long-range CATL battery and Huawei's cabin software and driver-assist stack. The most specialised order in this range: home or business charging is specified as part of the quote, and the lead time runs longer than the petrol cars.",
  },
];

export function getVehicle(id: string): Vehicle | undefined {
  return VEHICLES.find((v) => v.id === id);
}

export function vehicleName(v: Vehicle): string {
  return `${v.make} ${v.model}`;
}

export function leadTimeLabel(v: Vehicle): string {
  const [min, max] = v.leadTimeWeeks;
  return `${min}–${max} weeks`;
}

/** Makes present in the catalog, for the filter rail. */
export function vehicleMakes(): string[] {
  return [...new Set(VEHICLES.map((v) => v.make))].sort();
}

export function relatedVehicles(vehicle: Vehicle, limit = 3): Vehicle[] {
  // Same body style first, then anything else — a coupe-SUV shopper is rarely
  // cross-shopping a seven-seater.
  const sameBody = VEHICLES.filter((v) => v.id !== vehicle.id && v.bodyType === vehicle.bodyType);
  const rest = VEHICLES.filter((v) => v.id !== vehicle.id && v.bodyType !== vehicle.bodyType);
  return [...sameBody, ...rest].slice(0, limit);
}

import type { LucideIcon } from "lucide-react";
import { Fuel, BatteryCharging, Leaf } from "lucide-react";

// Fotizo Autos — vehicles sourced worldwide and shipped to the customer's
// country. Not a China-only range: Chinese marques sit alongside Japanese and
// German ones, and freight goes to whichever port the buyer needs.
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
//   toyota-corolla:  "Toyota Corolla E210 sedan Sanming 01" / "Shishi 01" (CC BY-SA 4.0) — https://commons.wikimedia.org/wiki/File:Toyota_Corolla_E210_sedan_Sanming_01_2022-07-27.jpg
//   geely-coolray:   "Geely Coolray SX11 FL 1.5TD Sport Plus" (CC BY-SA 4.0), "Moscow - 2026 - Geely Coolray" (CC BY 4.0)
//   byd-atto-3:      "BYD Atto 3 1X7A6491/6493/6494" (CC BY-SA 4.0) — https://commons.wikimedia.org/wiki/File:BYD_Atto_3_1X7A6491.jpg
//   byd-song-plus:   "BYD Song Plus DM-i 002" / "IMG003" (CC BY-SA 4.0) — https://commons.wikimedia.org/wiki/File:BYD_Song_Plus_DM-i_002.jpg
//   toyota-rav4:     "2022 MY Toyota RAV4 Hybrid facelift XA50", "TOYOTA RAV4 HYBRID (XA50) China" (CC BY-SA 4.0)
//   audi-q5:         "2021 Audi Q5 45 TFSI Quattro front/rear", "2023 Audi Q5 quattro front" (CC BY-SA 4.0)
//   landwind-x7:     "Landwind X7 facelift 003" (CC0), "Landwind X7 01 -- Auto Shanghai" (CC BY-SA 4.0)
//   ford-ranger:     "Ford Ranger (T6, P703) Wildtrak IMG 7320 / 7323" (CC BY-SA 4.0)
//   toyota-prado:    "2025 Toyota Land Cruiser Prado 250 2.4 Turbo … front left / rear left" (CC BY-SA 4.0)
//   byd-seal:        "BYD Seal IAA 2023 1X7A0026 / 1X7A0371" (CC BY-SA 4.0)
//   haval-h6:        "Great Wall Haval H6 Sanming 01", "2021 … China Chic Edition (front)" (CC BY-SA 4.0)
//   hyundai-tucson:  "Hyundai Tucson (NX4) 1X7A0424", "2022 Hyundai Tucson SEL with HTRAC AWD" (CC BY-SA 4.0)
//   toyota-camry:    "TOYOTA CAMRY (XV70) China", "Toyota Camry (XV70) IMG 9081" (CC BY-SA 4.0)
//   honda-crv:       "2023 Honda CR-V EX-L AWD, front right", "Honda CR-V (6th generation) hybrid 1X7A0866" (CC BY-SA 4.0)

export type FuelType = "petrol" | "hybrid" | "electric";
export type BodyType = "suv" | "coupe-suv" | "sedan" | "pickup";

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
   * Indicative landed price in the app's base currency (GBP) — the vehicle plus
   * sea freight, before the destination country's duty and taxes, which vary
   * far too much between markets to quote here. The binding figure is always
   * given per enquiry, once the destination port and spec are known.
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

// Menu order for the filter rail. Types with no vehicle behind them are hidden
// at render time, so a new type can be declared here before its first car
// lands without leaving customers a chip that returns nothing.
export const BODY_LABELS: Record<BodyType, string> = {
  suv: "SUV",
  "coupe-suv": "Coupe SUV",
  sedan: "Sedan",
  pickup: "Pickup",
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
      "Jetour's seven-seat workhorse and the volume seller of the range — three rows, a high driving position and a usable boot with the third row folded. The suspension is tuned soft, which suits rough road surfaces, and the 1.5L turbo is among the cheapest engines here to run and to service. The default choice for family or fleet buyers.",
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
      "The Dashing is Jetour's sharper-styled compact SUV — split lighting, a wide grille and a dual-clutch gearbox, pitched at younger urban buyers. Smaller than the X70 and noticeably easier to park and thread through city traffic, without giving up the raised seating position.",
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

  // ── Beyond the Chinese marques: Japanese and German options, plus the
  // hybrid and sedan the range was missing ─────────────────────────────────
  {
    id: "toyota-corolla",
    make: "Toyota",
    model: "Corolla",
    bodyType: "sedan",
    fuel: "petrol",
    seats: 5,
    transmission: "CVT automatic",
    drivetrain: "Front-wheel drive",
    powertrain: "1.6L / 1.8L petrol",
    efficiency: "≈ 6.1 L/100km combined",
    landedPrice: 17400,
    leadTimeWeeks: [6, 10],
    image: "https://upload.wikimedia.org/wikipedia/commons/5/58/Toyota_Corolla_E210_sedan_Sanming_01_2022-07-27.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/5/58/Toyota_Corolla_E210_sedan_Sanming_01_2022-07-27.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/9/9c/Toyota_Corolla_E210_sedan_Shishi_01_2022-06-13.jpg",
    ],
    highlights: ["Parts everywhere", "Legendary reliability", "Strongest resale"],
    description:
      "The default sensible saloon, and the one every mechanic already knows how to fix. Parts are available in practically every market, running costs are low and resale holds better than anything else at this price. Not exciting — that isn't what it's for.",
  },
  {
    id: "geely-coolray",
    make: "Geely",
    model: "Coolray",
    bodyType: "suv",
    fuel: "petrol",
    seats: 5,
    transmission: "7-speed dual-clutch",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L turbo petrol",
    efficiency: "≈ 7.2 L/100km combined",
    landedPrice: 18900,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Geely_Coolray_SX11_FL_1.5TD_Sport_Plus_Blur_Gray_02.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/e/e6/Geely_Coolray_SX11_FL_1.5TD_Sport_Plus_Blur_Gray_02.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/4/47/Moscow_-_2026_-_Geely_Coolray_compact_crossover.jpg",
    ],
    highlights: ["Quick for its class", "Volvo-derived engineering", "Well equipped as standard"],
    description:
      "Geely's compact crossover, built on engineering shared with Volvo since Geely owns them. The 1.5 turbo is genuinely quick for the class and the standard equipment list embarrasses cars costing more. A sharper drive than most of its rivals.",
  },
  {
    id: "byd-atto-3",
    make: "BYD",
    model: "Atto 3",
    bodyType: "suv",
    fuel: "electric",
    seats: 5,
    transmission: "Single-speed",
    drivetrain: "Front-wheel drive",
    powertrain: "Single electric motor",
    efficiency: "≈ 420 km WLTP range",
    landedPrice: 27600,
    leadTimeWeeks: [10, 14],
    image: "https://upload.wikimedia.org/wikipedia/commons/3/3e/BYD_Atto_3_1X7A6491.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/3e/BYD_Atto_3_1X7A6491.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/9/9c/BYD_Atto_3_1X7A6493.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/1/10/BYD_Atto_3_1X7A6494.jpg",
    ],
    highlights: ["Blade LFP battery", "BYD builds its own cells", "Best-selling global EV"],
    description:
      "BYD's global volume EV, and the car that made the brand a household name outside China. It uses BYD's own Blade battery — lithium iron phosphate, which tolerates heat and full charging better than the alternatives, a real advantage in hot climates. Charging setup is agreed as part of the quote.",
  },
  {
    id: "byd-song-plus-dmi",
    make: "BYD",
    model: "Song Plus DM-i",
    bodyType: "suv",
    fuel: "hybrid",
    seats: 5,
    transmission: "E-CVT",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L petrol plug-in hybrid",
    efficiency: "≈ 110 km electric, then ≈ 4.5 L/100km",
    landedPrice: 25300,
    leadTimeWeeks: [10, 14],
    image: "https://upload.wikimedia.org/wikipedia/commons/4/46/BYD_Song_Plus_DM-i_002.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/4/46/BYD_Song_Plus_DM-i_002.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/3c/BYD_Song_Plus_DM-i_IMG003.jpg",
    ],
    highlights: ["No range anxiety", "Runs electric in town", "Petrol for long trips"],
    description:
      "A plug-in hybrid that answers the usual objection to electric cars: charge it and the daily commute is electric, run out and the petrol engine simply takes over. The sensible middle path where charging infrastructure is still thin, and markedly cheaper to run than the petrol SUVs here.",
  },
  {
    id: "toyota-rav4-hybrid",
    make: "Toyota",
    model: "RAV4 Hybrid",
    bodyType: "suv",
    fuel: "hybrid",
    seats: 5,
    transmission: "E-CVT",
    drivetrain: "All-wheel drive",
    powertrain: "2.5L petrol hybrid",
    efficiency: "≈ 5.0 L/100km combined",
    landedPrice: 31200,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/e/eb/2022_MY_Toyota_RAV4_Hybrid_facelift_XA50.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/e/eb/2022_MY_Toyota_RAV4_Hybrid_facelift_XA50.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/0f/TOYOTA_RAV4_HYBRID_%28XA50%29_China.jpg",
    ],
    highlights: ["Self-charging — no plug", "All-wheel drive", "Toyota hybrid reliability"],
    description:
      "Toyota's hybrid system needs no charging point at all — it charges itself as you drive, which makes it the low-fuss choice where plugging in isn't practical. Two decades of refinement behind the drivetrain, all-wheel drive as standard, and the running costs of a much smaller car.",
  },
  {
    id: "audi-q5",
    make: "Audi",
    model: "Q5",
    bodyType: "suv",
    fuel: "petrol",
    seats: 5,
    transmission: "7-speed S tronic",
    drivetrain: "quattro all-wheel drive",
    powertrain: "2.0L TFSI turbo petrol",
    efficiency: "≈ 8.0 L/100km combined",
    landedPrice: 44800,
    leadTimeWeeks: [8, 14],
    image: "https://upload.wikimedia.org/wikipedia/commons/1/17/2021_Audi_Q5_45_TFSI_Quattro_front.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/1/17/2021_Audi_Q5_45_TFSI_Quattro_front.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/c9/2021_Audi_Q5_45_TFSI_Quattro_rear.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/2/22/2023_Audi_Q5_quattro_front.jpg",
    ],
    highlights: ["quattro AWD", "Premium German build", "Executive presence"],
    description:
      "The German executive option in this range. Interior quality is a clear step above everything else here, quattro all-wheel drive is standard, and it carries the badge that still matters in a car park. Servicing costs more and specialist parts take longer to source — worth factoring in before ordering.",
  },
  {
    id: "landwind-x7",
    make: "Landwind",
    model: "X7",
    bodyType: "suv",
    fuel: "petrol",
    seats: 5,
    transmission: "6-speed automatic",
    drivetrain: "Front-wheel drive",
    powertrain: "2.0L turbo petrol",
    efficiency: "≈ 8.6 L/100km combined",
    landedPrice: 15200,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/8/81/Landwind_X7_facelift_003.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/8/81/Landwind_X7_facelift_003.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/5/5b/Landwind_X7_01_--_Auto_Shanghai_--_2015-04-22.jpg",
    ],
    highlights: ["Cheapest in the range", "Big-SUV presence", "Simple to maintain"],
    description:
      "The budget entry point: a large-looking SUV for well under the price of anything else here. The trade-off is a plainer interior and less refinement than the newer Chinese marques, but the mechanicals are simple and cheap to keep on the road. Good value if presence matters more than polish.",
  },

  // ── Pickups, premium marques and mainstream Japanese/Korean options ────────
  {
    id: "ford-ranger",
    make: "Ford",
    model: "Ranger Wildtrak",
    bodyType: "pickup",
    fuel: "petrol",
    seats: 5,
    transmission: "10-speed automatic",
    drivetrain: "Selectable four-wheel drive",
    powertrain: "2.0L bi-turbo diesel",
    efficiency: "≈ 7.6 L/100km combined",
    landedPrice: 32400,
    leadTimeWeeks: [8, 14],
    image: "https://upload.wikimedia.org/wikipedia/commons/2/28/Ford_Ranger_%28T6%2C_P703%29_Wildtrak_IMG_7320.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/2/28/Ford_Ranger_%28T6%2C_P703%29_Wildtrak_IMG_7320.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/5/57/Ford_Ranger_%28T6%2C_P703%29_Wildtrak_IMG_7323.jpg",
    ],
    highlights: ["Car-like to drive", "Best cabin in class", "10-speed auto"],
    description:
      "The Ranger does the pickup job without punishing you for it — the Wildtrak's cabin and ride are closer to an SUV than a work truck, and the bi-turbo diesel is smooth with the ten-speed box. The one to choose if it doubles as the family car.",
  },
  {
    id: "toyota-land-cruiser-prado",
    make: "Toyota",
    model: "Land Cruiser Prado",
    bodyType: "suv",
    fuel: "petrol",
    seats: 7,
    transmission: "8-speed automatic",
    drivetrain: "Full-time four-wheel drive",
    powertrain: "2.4L turbo petrol",
    efficiency: "≈ 9.5 L/100km combined",
    landedPrice: 58900,
    leadTimeWeeks: [12, 20],
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e5/2025_Toyota_Land_Cruiser_Prado_250_2.4_Turbo_in_White_Pearl_Mica%2C_front_left.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/e/e5/2025_Toyota_Land_Cruiser_Prado_250_2.4_Turbo_in_White_Pearl_Mica%2C_front_left.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/82/2025_Toyota_Land_Cruiser_Prado_2.4_Turbo_in_White_Pearl_Mica%2C_rear_left.jpg",
    ],
    highlights: ["Genuine off-road ability", "Seven seats", "Holds value like nothing else"],
    description:
      "The serious end of the range. Ladder-frame, locking differentials and the durability the Land Cruiser name is built on — this is the vehicle NGOs and mining companies buy when failure isn't an option. Long lead time and the highest price here, and still the strongest resale of anything we ship.",
  },
  {
    id: "byd-seal",
    make: "BYD",
    model: "Seal",
    bodyType: "sedan",
    fuel: "electric",
    seats: 5,
    transmission: "Single-speed",
    drivetrain: "Rear-wheel drive",
    powertrain: "Single electric motor",
    efficiency: "≈ 570 km CLTC range",
    landedPrice: 33900,
    leadTimeWeeks: [10, 14],
    image: "https://upload.wikimedia.org/wikipedia/commons/3/34/BYD_Seal_IAA_2023_1X7A0026.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/34/BYD_Seal_IAA_2023_1X7A0026.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/ff/BYD_Seal_IAA_2023_1X7A0371.jpg",
    ],
    highlights: ["Rear-wheel drive", "Cell-to-body Blade battery", "Genuinely quick"],
    description:
      "BYD's electric saloon and the sharpest thing they build — rear-wheel drive, a low centre of gravity from the battery being structural rather than bolted underneath, and acceleration that embarrasses cars costing twice as much. The enthusiast's pick in the electric range.",
  },
  {
    id: "haval-h6",
    make: "Haval",
    model: "H6",
    bodyType: "suv",
    fuel: "petrol",
    seats: 5,
    transmission: "7-speed dual-clutch",
    drivetrain: "Front-wheel drive",
    powertrain: "1.5L / 2.0L turbo petrol",
    efficiency: "≈ 7.9 L/100km combined",
    landedPrice: 20400,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f2/Great_Wall_Haval_H6_Sanming_01_2023-03-30.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f2/Great_Wall_Haval_H6_Sanming_01_2023-03-30.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/d/db/2021_Great_Wall_Haval_H6_China_Chic_Edition_%28front%29.jpg",
    ],
    highlights: ["China's best-selling SUV", "Roomy cabin", "Long warranty"],
    description:
      "Great Wall's H6 has been China's best-selling SUV for years, which means the platform is thoroughly debugged and parts are everywhere. Bigger inside than the Coolray or Dashing at a similar price, with a generous warranty. A safe, sensible family choice.",
  },
  {
    id: "hyundai-tucson",
    make: "Hyundai",
    model: "Tucson",
    bodyType: "suv",
    fuel: "petrol",
    seats: 5,
    transmission: "8-speed automatic",
    drivetrain: "Front-wheel drive",
    powertrain: "1.6L turbo petrol",
    efficiency: "≈ 7.4 L/100km combined",
    landedPrice: 28700,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Hyundai_Tucson_%28NX4%29_1X7A0424.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f1/Hyundai_Tucson_%28NX4%29_1X7A0424.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/00/2022_Hyundai_Tucson_SEL_with_HTRAC_All_Wheel_Drive.jpg",
    ],
    highlights: ["Striking design", "Strong warranty", "Established dealer network"],
    description:
      "The Tucson trades on design — the jewelled grille with hidden daytime running lights still stops people in car parks. Underneath it's a thoroughly conventional, well-built family SUV with Hyundai's long warranty and a service network that already exists in most markets.",
  },
  {
    id: "toyota-camry",
    make: "Toyota",
    model: "Camry",
    bodyType: "sedan",
    fuel: "hybrid",
    seats: 5,
    transmission: "E-CVT",
    drivetrain: "Front-wheel drive",
    powertrain: "2.5L petrol hybrid",
    efficiency: "≈ 4.7 L/100km combined",
    landedPrice: 26400,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/e/e1/TOYOTA_CAMRY_%28XV70%29_China.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/e/e1/TOYOTA_CAMRY_%28XV70%29_China.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/e/ef/Toyota_Camry_%28XV70%29_IMG_9081.jpg",
    ],
    highlights: ["Executive comfort", "Self-charging hybrid", "Exceptional resale"],
    description:
      "The saloon people move up to. Quiet, comfortable and substantially bigger inside than a Corolla, with a self-charging hybrid that returns small-car fuel figures without ever needing a charging point. The default choice for executives, hire fleets and anyone doing serious mileage.",
  },
  {
    id: "honda-crv",
    make: "Honda",
    model: "CR-V",
    bodyType: "suv",
    fuel: "hybrid",
    seats: 5,
    transmission: "E-CVT",
    drivetrain: "All-wheel drive",
    powertrain: "2.0L petrol hybrid",
    efficiency: "≈ 5.5 L/100km combined",
    landedPrice: 30100,
    leadTimeWeeks: [8, 12],
    image: "https://upload.wikimedia.org/wikipedia/commons/1/1e/2023_Honda_CR-V_EX-L_AWD%2C_front_right%2C_11-13-2022.jpg",
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/1/1e/2023_Honda_CR-V_EX-L_AWD%2C_front_right%2C_11-13-2022.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/4/4d/Honda_CR-V_%286th_generation%29_hybrid_1X7A0866.jpg",
    ],
    highlights: ["Biggest boot in class", "Honda reliability", "No plug needed"],
    description:
      "The RAV4's oldest rival and its equal on reliability. Roomier in the back and the boot than almost anything at this size, with a self-charging hybrid drivetrain and Honda's reputation for engines that simply don't break. The sensible family SUV.",
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

// The filter rails are built from what's actually in stock, not from the full
// set of declared types — otherwise "Sedan" or "Hybrid" sit there as chips that
// can only ever return an empty grid. Both keep their declared menu order.
export function vehicleBodyTypes(): BodyType[] {
  const present = new Set(VEHICLES.map((v) => v.bodyType));
  return (Object.keys(BODY_LABELS) as BodyType[]).filter((b) => present.has(b));
}

export function vehicleFuelTypes(): FuelType[] {
  const present = new Set(VEHICLES.map((v) => v.fuel));
  return (Object.keys(FUEL_LABELS) as FuelType[]).filter((f) => present.has(f));
}

export function relatedVehicles(vehicle: Vehicle, limit = 3): Vehicle[] {
  // Same body style first, then anything else — a coupe-SUV shopper is rarely
  // cross-shopping a seven-seater.
  const sameBody = VEHICLES.filter((v) => v.id !== vehicle.id && v.bodyType === vehicle.bodyType);
  const rest = VEHICLES.filter((v) => v.id !== vehicle.id && v.bodyType !== vehicle.bodyType);
  return [...sameBody, ...rest].slice(0, limit);
}

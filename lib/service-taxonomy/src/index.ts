// Fotizo service taxonomy — the single source of truth for how a service
// provider is grouped on the platform. Shared by the web app (category
// dropdowns, filtering) and the API server (which derives the group from the
// category server-side so a client can't file itself under the wrong one).
//
// The grouping rule, so new categories land consistently:
//
//   freelancers  — knowledge work sold as projects/retainers, usually delivered
//                  remotely. The output is a file, a system or advice.
//   artisans     — hands-on skilled work performed on a person, a garment, a
//                  vehicle or a building. The provider is the craft; the work
//                  happens at a shop, a site or the customer's home.
//   businesses   — registered outfits selling a team's capacity rather than one
//                  pair of hands: crews, fleets, venues, equipment, inventory.
//
// So "lash tech" is an artisan (hands-on personal-care craft), "plumber" is an
// artisan (on-site trade), "catering company" is a business (crew + kit), and
// "brand designer" is a freelancer (remote project work).

export type ServiceGroupId = "freelancers" | "artisans" | "businesses";

export interface ServiceGroup {
  id: ServiceGroupId;
  label: string;
  /** Short line used under the group heading in filter menus. */
  tagline: string;
  /** How this group is described to a provider choosing where they belong. */
  description: string;
  /** lucide-react icon name; resolved by the UI, kept as a string so this package stays dependency-free. */
  icon: string;
}

export interface ServiceCategory {
  id: string;
  label: string;
  group: ServiceGroupId;
  /** Extra search terms so "beautician" or "sparky" still find the right category. */
  aliases: string[];
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    id: "freelancers",
    label: "Freelancers",
    tagline: "Project work, delivered remotely",
    description:
      "You sell knowledge work — design, code, words, numbers or strategy — as projects or retainers, mostly online.",
    icon: "Laptop",
  },
  {
    id: "artisans",
    label: "Artisans & Trades",
    tagline: "Hands-on skilled work, on site or in shop",
    description:
      "You work with your hands on a person, a garment, a vehicle or a building — at your shop, a site, or the customer's home.",
    icon: "Hammer",
  },
  {
    id: "businesses",
    label: "Business Owners",
    tagline: "Registered outfits with a team behind them",
    description:
      "You run a registered outfit that sells a team's capacity — a crew, a fleet, a venue, equipment or stock — not just your own hours.",
    icon: "Building2",
  },
];

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  // ── Freelancers ────────────────────────────────────────────────────────────
  { id: "web-development", label: "Web Development", group: "freelancers", aliases: ["developer", "programmer", "software", "coder", "development & tech"] },
  { id: "mobile-development", label: "Mobile App Development", group: "freelancers", aliases: ["android", "ios", "app developer"] },
  { id: "graphic-design", label: "Graphic Design", group: "freelancers", aliases: ["designer", "logo", "branding", "flyer", "design & creative"] },
  { id: "ui-ux-design", label: "UI/UX Design", group: "freelancers", aliases: ["product design", "figma"] },
  { id: "writing-translation", label: "Writing & Translation", group: "freelancers", aliases: ["copywriter", "content", "editor", "translator"] },
  { id: "digital-marketing", label: "Digital Marketing", group: "freelancers", aliases: ["seo", "ads", "social media manager", "growth", "marketing & sales"] },
  { id: "video-animation", label: "Video & Animation", group: "freelancers", aliases: ["video editor", "motion graphics", "animator"] },
  { id: "photography", label: "Photography & Videography", group: "freelancers", aliases: ["photographer", "videographer", "shoot"] },
  { id: "accounting-finance", label: "Accounting & Finance", group: "freelancers", aliases: ["bookkeeper", "accountant", "tax", "auditor"] },
  { id: "legal-services", label: "Legal Services", group: "freelancers", aliases: ["lawyer", "attorney", "contracts", "notary"] },
  { id: "business-consulting", label: "Business Consulting", group: "freelancers", aliases: ["consultant", "strategy", "business plan", "consulting & business"] },
  { id: "virtual-assistance", label: "Virtual Assistance", group: "freelancers", aliases: ["va", "admin support", "data entry"] },
  { id: "tutoring", label: "Tutoring & Training", group: "freelancers", aliases: ["teacher", "lessons", "coach", "trainer"] },
  { id: "music-audio", label: "Music & Audio", group: "freelancers", aliases: ["producer", "mixing", "voice over", "beats"] },

  // ── Artisans & Trades ──────────────────────────────────────────────────────
  { id: "barbering", label: "Barbering", group: "artisans", aliases: ["barber", "haircut", "fade", "shave"] },
  { id: "hairdressing", label: "Hairdressing & Braiding", group: "artisans", aliases: ["hairstylist", "salon", "braids", "weave", "locs"] },
  { id: "nail-tech", label: "Nail Technician", group: "artisans", aliases: ["nail tech", "manicure", "pedicure", "acrylics", "gel"] },
  { id: "lash-tech", label: "Lash & Brow Technician", group: "artisans", aliases: ["lash tech", "eyelash extensions", "microblading", "brows"] },
  { id: "makeup-artistry", label: "Makeup Artistry", group: "artisans", aliases: ["mua", "makeup artist", "bridal makeup", "beautician"] },
  { id: "fashion-design", label: "Fashion Design & Tailoring", group: "artisans", aliases: ["fashion designer", "tailor", "seamstress", "dressmaker", "kente"] },
  { id: "cobbling", label: "Shoemaking & Repair", group: "artisans", aliases: ["cobbler", "shoemaker", "leatherwork"] },
  { id: "plumbing", label: "Plumbing", group: "artisans", aliases: ["plumber", "pipes", "drain", "water heater"] },
  { id: "electrical", label: "Electrical Work", group: "artisans", aliases: ["electrician", "wiring", "sparky", "sockets"] },
  { id: "carpentry", label: "Carpentry & Joinery", group: "artisans", aliases: ["carpenter", "furniture", "woodwork", "cabinets"] },
  { id: "masonry", label: "Masonry & Tiling", group: "artisans", aliases: ["mason", "bricklayer", "tiler", "plastering", "screed"] },
  { id: "painting-decorating", label: "Painting & Decorating", group: "artisans", aliases: ["painter", "decorator", "wallpaper"] },
  { id: "welding-fabrication", label: "Welding & Metal Fabrication", group: "artisans", aliases: ["welder", "fabricator", "gates", "burglar proof"] },
  { id: "ac-refrigeration", label: "AC & Refrigeration", group: "artisans", aliases: ["air conditioning", "fridge repair", "hvac"] },
  { id: "appliance-repair", label: "Appliance & Electronics Repair", group: "artisans", aliases: ["tv repair", "phone repair", "technician"] },
  { id: "auto-mechanic", label: "Auto Mechanics", group: "artisans", aliases: ["mechanic", "car repair", "fitter", "auto electrician"] },
  { id: "upholstery", label: "Upholstery & Interiors", group: "artisans", aliases: ["upholsterer", "curtains", "sofa", "interior finishing"] },
  { id: "beadwork-crafts", label: "Beadwork & Handicrafts", group: "artisans", aliases: ["artisan", "crafts", "jewellery maker", "pottery"] },

  // ── Business Owners ────────────────────────────────────────────────────────
  { id: "catering", label: "Catering & Food Service", group: "businesses", aliases: ["caterer", "chef", "food vendor", "bakery"] },
  { id: "event-planning", label: "Event Planning & Rentals", group: "businesses", aliases: ["event planner", "decorator", "canopy", "chairs", "wedding"] },
  { id: "cleaning-services", label: "Cleaning Services", group: "businesses", aliases: ["cleaner", "fumigation", "janitorial", "housekeeping"] },
  { id: "logistics-moving", label: "Logistics & Moving", group: "businesses", aliases: ["dispatch", "courier", "haulage", "removals", "truck"] },
  { id: "construction", label: "Construction & Building", group: "businesses", aliases: ["contractor", "builder", "civil works", "renovation"] },
  { id: "printing-branding", label: "Printing & Branding", group: "businesses", aliases: ["print shop", "signage", "large format", "souvenirs"] },
  { id: "salon-spa", label: "Salon & Spa", group: "businesses", aliases: ["beauty salon", "spa", "barbershop", "wellness centre"] },
  { id: "security-services", label: "Security Services", group: "businesses", aliases: ["security company", "guards", "cctv", "alarm"] },
  { id: "real-estate", label: "Real Estate & Property", group: "businesses", aliases: ["estate agent", "property manager", "rentals", "landlord"] },
  { id: "equipment-rental", label: "Equipment Rental", group: "businesses", aliases: ["hire", "generator rental", "sound system", "machinery"] },
  { id: "auto-services", label: "Auto Services & Car Hire", group: "businesses", aliases: ["car rental", "driving school", "car wash", "fleet"] },
  { id: "agriculture", label: "Agriculture & Agro-Processing", group: "businesses", aliases: ["farm", "poultry", "produce", "agribusiness"] },
];

const CATEGORY_BY_ID = new Map(SERVICE_CATEGORIES.map((c) => [c.id, c]));
const GROUP_BY_ID = new Map(SERVICE_GROUPS.map((g) => [g.id, g]));

export function getServiceCategory(id: string): ServiceCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function getServiceGroup(id: string): ServiceGroup | undefined {
  return GROUP_BY_ID.get(id as ServiceGroupId);
}

export function isServiceCategoryId(id: string): boolean {
  return CATEGORY_BY_ID.has(id);
}

/**
 * The group a category files under. This is what routes a plumber's new
 * listing to Artisans & Trades without the provider picking a group.
 * Returns undefined for an unknown category so callers can reject it.
 */
export function groupForCategory(categoryId: string): ServiceGroupId | undefined {
  return CATEGORY_BY_ID.get(categoryId)?.group;
}

export function categoriesInGroup(groupId: ServiceGroupId): ServiceCategory[] {
  return SERVICE_CATEGORIES.filter((c) => c.group === groupId);
}

/** Groups paired with their categories, in menu order — for grouped dropdowns. */
export function groupedServiceCategories(): { group: ServiceGroup; categories: ServiceCategory[] }[] {
  return SERVICE_GROUPS.map((group) => ({ group, categories: categoriesInGroup(group.id) }));
}

export function serviceCategoryLabel(categoryId: string): string {
  return CATEGORY_BY_ID.get(categoryId)?.label ?? categoryId;
}

export function serviceGroupLabel(groupId: string): string {
  return GROUP_BY_ID.get(groupId as ServiceGroupId)?.label ?? groupId;
}

/**
 * Best-effort match of free text ("plumber", "lash tech") to a category id,
 * used when importing legacy listings whose category was a free-form string.
 * Some aliases exist purely for that backfill — the old wizard's free-text
 * categories ("Design & Creative", "Development & Tech", …) map through here.
 */
export function matchServiceCategory(text: string): ServiceCategory | undefined {
  const q = text.trim().toLowerCase();
  if (!q) return undefined;
  const exact = CATEGORY_BY_ID.get(q);
  if (exact) return exact;
  return (
    SERVICE_CATEGORIES.find((c) => c.label.toLowerCase() === q) ??
    SERVICE_CATEGORIES.find((c) => c.aliases.some((a) => a === q)) ??
    SERVICE_CATEGORIES.find(
      (c) => c.label.toLowerCase().includes(q) || c.aliases.some((a) => a.includes(q)),
    )
  );
}

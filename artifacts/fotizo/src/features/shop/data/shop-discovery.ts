import type { ShopProduct } from "./shop-product";

export type ShopCollection = {
  id: string;
  label: string;
  match: (title: string) => boolean;
};
const text = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'");
const has = (r: RegExp) => (s: string) => r.test(s);
const kids = /\b(baby|babies|children|kids?|girls?|boys?|toddler|infant)/;
const bags =
  /\b(bags?|backpacks?|handbags?|purses?|luggage|wallets?|totes?|pouches?)\b/;
const shoes =
  /\b(shoes?|trainers?|sneakers?|loafers?|boots?|sandals?|slippers?|clogs?|heels|pumps|footwear)\b/;
const footwear = (s: string) =>
  shoes.test(s) &&
  !bags.test(s) &&
  !/\b(insoles?|laces|shoehorns?|polish|racks?)\b/.test(s);
const group = (id: string, label: string, pattern: RegExp): ShopCollection => ({
  id,
  label,
  match: has(pattern),
});
export const SHOP_COLLECTIONS: Record<string, ShopCollection[]> = {
  "shoes-bags": [
    {
      id: "women-shoes",
      label: "Women’s shoes",
      match: (s) =>
        footwear(s) &&
        !kids.test(s) &&
        /\b(women|ladies|female|unisex)\b/.test(s),
    },
    {
      id: "men-shoes",
      label: "Men’s shoes",
      match: (s) =>
        footwear(s) && !kids.test(s) && /\b(men|male|unisex)\b/.test(s),
    },
    {
      id: "kids-shoes",
      label: "Kids’ shoes",
      match: (s) => footwear(s) && kids.test(s),
    },
    { id: "all-footwear", label: "All footwear", match: footwear },
    { id: "bags", label: "Bags & luggage", match: has(bags) },
  ],
  mens: [
    group("shirts", "Shirts", /(?:^|\s)shirt\b/),
    group("tees", "T-shirts", /\bt-shirt\b/),
    group("jeans", "Jeans", /\bjeans\b/),
    group("trousers", "Trousers", /\b(trousers|pants|chinos)\b/),
    group(
      "layers",
      "Jackets & layers",
      /\b(jacket|hoodie|sweatshirt|jumper|coat)\b/,
    ),
  ],
  womens: [
    group("dresses", "Dresses", /\bdress(es)?\b/),
    group("tops", "Tops & blouses", /\b(top|blouse|shirt|t-shirt)\b/),
    group("jeans", "Jeans & trousers", /\b(jeans|trousers|pants)\b/),
    group("skirts", "Skirts", /\bskirt\b/),
    group(
      "knitwear",
      "Knitwear & layers",
      /\b(cardigan|jumper|sweater|jacket|sweatshirt|hoodie)\b/,
    ),
  ],
  baby: [
    group(
      "feeding",
      "Feeding",
      /\b(feeding|bottle|teat|pacifier|teether|bib|utensils|drinking|food storage)\b/,
    ),
    group(
      "clothing",
      "Baby clothing",
      /\b(romper|clothing|top|pyjamas|dress|jacket|trousers|socks|hat|jumper)\b/,
    ),
    group(
      "bath",
      "Bath & changing",
      /\b(bath|washcloth|nappies|changing|wipes|nail)\b/,
    ),
    group("out-about", "Out & about", /\b(pushchair|carrier|bag|stroller)\b/),
  ],
  beauty: [
    group(
      "makeup-tools",
      "Makeup tools",
      /\b(makeup|brush|sponge|cosmetic|applicator)\b/,
    ),
    group(
      "eyes-brows",
      "Eyes & brows",
      /\b(eyelash|eyebrow|lash|brow|eyeliner)\b/,
    ),
    group("nails", "Nail care", /\b(nail|manicure)\b/),
    group("skin", "Skin care", /\b(facial|face|cleansing|skin|serum|cream)\b/),
  ],
  appliances: [
    group(
      "cooking",
      "Cooking",
      /\b(cooker|fryer|oven|hob|pot|griddle|steamer|hotplate)\b/,
    ),
    group(
      "drinks",
      "Coffee & drinks",
      /\b(coffee|kettle|blender|tea|juice|dispenser)\b/,
    ),
    group(
      "food-prep",
      "Food preparation",
      /\b(chopper|mixer|whisk|bread|waffle|sandwich)\b/,
    ),
    group(
      "cleaning",
      "Cleaning",
      /\b(vacuum|washer|washing|dryer|steamer|iron)\b/,
    ),
    group(
      "climate",
      "Heating & cooling",
      /\b(fan|heater|humidifier|purifier|refrigerator)\b/,
    ),
  ],
  furniture: [
    group("seating", "Sofas & chairs", /\b(sofa|chair|stool|seating)\b/),
    group("tables", "Tables & desks", /\b(table|desk)\b/),
    group(
      "storage",
      "Storage",
      /\b(cabinet|wardrobe|bookcase|shelving|sideboard|rack)\b/,
    ),
    group("bedroom", "Bedroom", /\b(bed|mattress|bedside|wardrobe|dressing)\b/),
  ],
  computers: [
    group("laptops", "Laptops & tablets", /\b(laptop|tablet)\b/),
    group("peripherals", "Keyboards & mice", /\b(keyboard|mouse|trackpad)\b/),
    group("storage", "Storage & cables", /\b(drive|storage|cable|hub)\b/),
    group("displays", "Monitors & displays", /\b(monitor|display)\b/),
  ],
  jewellery: [
    group("necklaces", "Necklaces", /\b(necklace|pendant)\b/),
    group("earrings", "Earrings", /\bearrings?\b/),
    group("rings", "Rings", /\brings?\b/),
    group("bracelets", "Bracelets", /\b(bracelet|bangle)\b/),
  ],
  wigs: [
    group("wigs", "Wigs", /\bwig\b/),
    group("extensions", "Extensions", /\b(extension|bundle|weft)\b/),
    group(
      "styling",
      "Styling tools",
      /\b(comb|dryer|curler|straightener|clipper|scissors)\b/,
    ),
    group(
      "care",
      "Hair care",
      /\b(shampoo|conditioner|gel|spray|wax|oil|cream)\b/,
    ),
  ],
  pets: [
    group("dogs", "Dogs", /\b(dog|puppy)\b/),
    group("cats", "Cats", /\b(cat|kitten)\b/),
    group("feeding", "Feeding", /\b(bowl|feeder|fountain)\b/),
    group("toys", "Toys & accessories", /\b(toy|collar|lead|leash|bed)\b/),
  ],
  lighting: [
    group(
      "indoor",
      "Indoor lighting",
      /\b(ceiling|pendant|wall|desk|floor|indoor)\b/,
    ),
    group(
      "outdoor",
      "Outdoor lighting",
      /\b(outdoor|garden|solar|street|floodlight)\b/,
    ),
    group(
      "portable",
      "Portable lights",
      /\b(torch|camping|portable|emergency)\b/,
    ),
    group("bulbs", "Bulbs & strips", /\b(bulb|strip|tube)\b/),
  ],
  industrial: [
    group("sets", "Tool sets", /\bset\b/),
    group(
      "hand-tools",
      "Hand tools",
      /\b(pliers|wrench|screwdriver|hammer|hex key)\b/,
    ),
    group("power-tools", "Power tools", /\b(electric|drill|sanding|grinder)\b/),
    group(
      "parts",
      "Parts & fasteners",
      /\b(fastener|bearing|spring|socket|bit)\b/,
    ),
  ],
  "smart-devices": [
    group(
      "controls",
      "Switches & controls",
      /\b(switch|control|remote|button)\b/,
    ),
    group(
      "security",
      "Home security",
      /\b(camera|doorbell|lock|sensor|access)\b/,
    ),
    group(
      "connected",
      "Connected home",
      /\b(gateway|curtain|thermostat|monitor|socket)\b/,
    ),
  ],
  clocks: [
    group("wall", "Wall clocks", /\bwall\b/),
    group("digital", "Digital clocks", /\bdigital\b/),
    group("alarm", "Alarm & table clocks", /\b(alarm|table)\b/),
  ],
  packaging: [
    group("boxes", "Boxes", /\bbox(es)?\b/),
    group("bags", "Bags & pouches", /\b(bag|pouch)\b/),
    group(
      "protection",
      "Wrap & protection",
      /\b(wrap|foam|bubble|protective|film)\b/,
    ),
    group("labels", "Labels & tape", /\b(label|tape|strap)\b/),
  ],
  office: [
    group(
      "writing",
      "Writing & stationery",
      /\b(pen|pencil|marker|notebook|exercise book)\b/,
    ),
    group("paper", "Paper & labels", /\b(paper|label|envelope)\b/),
    group(
      "organisation",
      "Desk organisation",
      /\b(folder|file|organiser|clipboard|box)\b/,
    ),
  ],
  general: [
    group("storage", "Storage", /\b(storage|organiser|rack|hook|basket|box)\b/),
    group("cleaning", "Cleaning", /\b(clean|cleaning|cloth|brush|mop|wipe)\b/),
    group(
      "kitchen",
      "Kitchen essentials",
      /\b(kitchen|cup|bottle|bowl|utensil|tray)\b/,
    ),
  ],
  car: [
    group(
      "interior",
      "Interior & storage",
      /\b(seat|interior|storage|organiser|cushion|floor mat)\b/,
    ),
    group(
      "care",
      "Car care",
      /\b(clean|cleaner|cleaning|polish|wax|brush|repair)\b/,
    ),
    group(
      "accessories",
      "Everyday accessories",
      /\b(phone|holder|mount|key|sunshade|cover)\b/,
    ),
  ],
  textiles: [
    group("bedding", "Bedding", /\b(bed|sheet|pillow|duvet|blanket|quilt)\b/),
    group("bath", "Towels & bath", /\b(towel|bath|robe)\b/),
    group(
      "soft-furnishings",
      "Soft furnishings",
      /\b(curtain|cushion|rug|carpet|tablecloth)\b/,
    ),
  ],
  accessories: [
    group("watches", "Watches", /\bwatch(es)?\b/),
    group("eyewear", "Eyewear", /\b(glasses|sunglasses|eyewear)\b/),
    group(
      "finishing-touches",
      "Hats & finishing touches",
      /\b(hat|cap|belt|scarf|glove)\b/,
    ),
  ],
  gymwear: [
    group("tops", "Tops & sports bras", /\b(top|shirt|bra|vest)\b/),
    group(
      "bottoms",
      "Leggings & shorts",
      /\b(legging|leggings|shorts|trousers|pants)\b/,
    ),
    group("sets", "Matching sets", /\b(set|tracksuit)\b/),
  ],
  underwear: [
    group("bras", "Bras", /\bbra(s)?\b/),
    group(
      "briefs",
      "Briefs & boxers",
      /\b(brief|briefs|boxer|boxers|panties)\b/,
    ),
    group("socks", "Socks", /\bsocks?\b/),
    group(
      "sleepwear",
      "Sleepwear",
      /\b(pyjamas|pajamas|sleepwear|nightdress)\b/,
    ),
  ],
  jackets: [
    group("puffers", "Puffer jackets", /\b(puffer|padded|down)\b/),
    group("coats", "Coats & parkas", /\b(coat|parka)\b/),
    group("jackets", "All jackets", /\bjacket\b/),
  ],
  improvement: [
    group("garden", "Garden", /\b(garden|plant|seedling|watering|lawn)\b/),
    group("hardware", "Hardware", /\b(fastener|hinge|handle|screw|lock)\b/),
    group("tools", "Tools", /\b(tool|drill|saw|hammer|wrench)\b/),
  ],
  electronics: [
    group(
      "components",
      "Components",
      /\b(component|circuit|resistor|capacitor|sensor|module|ic)\b/,
    ),
    group(
      "power",
      "Power & wiring",
      /\b(power|adapter|cable|wire|connector|battery)\b/,
    ),
    group(
      "testing",
      "Testing tools",
      /\b(multimeter|oscilloscope|soldering|tester)\b/,
    ),
  ],
  phones: [
    group(
      "handsets",
      "Phones",
      /\b(smartphone|mobile phone|cell phone|iphone)\b/,
    ),
    group("cases", "Cases & protection", /\b(case|cover|protector)\b/),
    group("charging", "Charging", /\b(charger|charging|cable|power bank)\b/),
  ],
  entertainment: [
    group("games", "Games & toys", /\b(game|gaming|toy|puzzle)\b/),
    group("audio", "Audio", /\b(speaker|headphone|earphone|microphone)\b/),
    group("outdoor", "Outdoor fun", /\b(outdoor|pool|inflatable|ball)\b/),
  ],
  sports: [
    group(
      "fitness",
      "Fitness",
      /\b(fitness|exercise|gym|dumbbell|treadmill)\b/,
    ),
    group("outdoor", "Outdoor & camping", /\b(outdoor|camping|tent|fishing)\b/),
    group("seating", "Sports seating", /\b(seat|bench|chair)\b/),
  ],
};
export function matchesCollection(
  p: Pick<ShopProduct, "title" | "category">,
  id?: string,
) {
  if (!id) return true;
  return (
    SHOP_COLLECTIONS[p.category]
      ?.find((c) => c.id === id)
      ?.match(text(p.title)) ?? false
  );
}
export function productCollections(p: Pick<ShopProduct, "title" | "category">) {
  return (SHOP_COLLECTIONS[p.category] ?? [])
    .filter((c) => c.match(text(p.title)))
    .map((c) => c.id);
}
export type ViewedProduct = {
  id: string;
  category: string;
  collections: string[];
  at: number;
};
function hash(id: string) {
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) | 0;
  return n >>> 0;
}
export function discoveryPicks(
  products: ShopProduct[],
  history: ViewedProduct[],
  limit = 12,
) {
  const seen = new Set(history.map((h) => h.id));
  const weights = new Map<string, number>();
  history.forEach((h, i) => {
    const weight = Math.max(1, 12 - i);
    weights.set(h.category, (weights.get(h.category) ?? 0) + weight);
    h.collections.forEach((c) =>
      weights.set(
        `${h.category}/${c}`,
        (weights.get(`${h.category}/${c}`) ?? 0) + weight,
      ),
    );
  });
  const preferred = [
    "womens",
    "shoes-bags",
    "appliances",
    "mens",
    "baby",
    "furniture",
    "beauty",
    "wigs",
  ];
  const ranked = products
    .filter((p) => p.price > 0 && p.image && !seen.has(p.id))
    .map((p) => ({
      p,
      score:
        (!history.length && preferred.includes(p.category)
          ? preferred.length - preferred.indexOf(p.category)
          : 0) +
        (weights.get(p.category) ?? 0) +
        productCollections(p).reduce(
          (n, c) => n + (weights.get(`${p.category}/${c}`) ?? 0) * 2,
          0,
        ),
    }))
    .sort((a, b) => b.score - a.score || hash(a.p.id) - hash(b.p.id));
  const result: ShopProduct[] = [],
    counts = new Map<string, number>();
  // Keep discovery varied rather than filling every slot with one department.
  for (const { p } of ranked) {
    if (
      (counts.get(p.category) ?? 0) >=
      Math.max(1, Math.ceil(limit / (history.length ? 3 : 6)))
    )
      continue;
    result.push(p);
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    if (result.length === limit) return result;
  }
  for (const { p } of ranked) {
    if (!result.some((r) => r.id === p.id)) result.push(p);
    if (result.length === limit) break;
  }
  return result;
}

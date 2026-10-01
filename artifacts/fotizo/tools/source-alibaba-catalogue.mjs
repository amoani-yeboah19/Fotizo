// Frontend-only sourcing. Never connects to a database.
// Run from the repository root: node artifacts/fotizo/tools/source-alibaba-catalogue.mjs
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SOURCES, toShopProduct, isRetailViable } from './import-alibaba.mjs';
import { parseProducts } from './parse-alibaba-page.mjs';

const rates = JSON.parse(await fs.readFile(new URL("../src/features/pricing/rates.json", import.meta.url), "utf8"));
const markup = 1 + rates.chineseGoods.markupPercent / 100;
const dataDir = new URL('../src/features/shop/data/', import.meta.url);
const categoryText = await fs.readFile(new URL('categories.ts', dataDir), 'utf8');
const categories = [...categoryText.matchAll(/\{ id: "([^"]+)", label: "([^"]+)"/g)].map((m) => ({ id: m[1], label: m[2] }));
const sources = { ...SOURCES,
  phones: ['https://www.alibaba.com/premium/best_selling_mobile_phones.html', 'https://www.alibaba.com/premium/android_smartphone.html', 'https://www.alibaba.com/premium/unlocked_mobile_phone.html', 'https://www.alibaba.com/premium/smartphone.html'],
  appliances: ['https://www.alibaba.com/premium/best_selling_home_appliances.html', 'https://www.alibaba.com/premium/electric_kettle.html'],
};
const EXTRA_SOURCES = {
  "shoes-bags": [
    "women_sneakers",
    "leather_handbag",
    "travel_backpack",
    "women_sandals"
  ],
  "general": [
    "kitchen_organizer",
    "storage_basket",
    "cleaning_brush",
    "storage_container",
    "mop"
  ],
  "wigs": [
    "human_hair_wig",
    "lace_front_wig",
    "glueless_wig",
    "human_hair_bundles"
  ],
  "jackets": [
    "winter_jacket",
    "puffer_jacket",
    "down_jacket",
    "women_winter_coat"
  ],
  "pets": [
    "dog_bed",
    "cat_tree",
    "dog_leash",
    "pet_carrier",
    "pet_toys",
    "cat_litter_box"
  ],
  "mens": [
    "men_polo_shirt",
    "men_linen_pants",
    "men_sweater",
    "men_casual_shirt"
  ],
  "sports": [
    "adjustable_dumbbell",
    "weight_bench",
    "resistance_band",
    "exercise_bike",
    "kettlebell"
  ],
  "gymwear": [
    "yoga_leggings",
    "sports_bra",
    "gym_shorts",
    "women_yoga_set"
  ],
  "beauty": [
    "makeup_brush_set",
    "lip_gloss",
    "eyeshadow_palette",
    "mascara",
    "facial_cleanser",
    "perfume"
  ],
  "womens": [
    "women_dress",
    "women_blouse",
    "women_jeans",
    "women_skirt"
  ],
  "accessories": [
    "bracelet",
    "necklace",
    "sunglasses",
    "earrings",
    "wrist_watch"
  ],
  "phones": [
    "unlocked_smartphone",
    "android_cell_phone",
    "rugged_smartphone",
    "4g_smartphone",
    "5g_smartphone",
    "oukitel_phone",
    "doogee_phone",
    "hotwav_phone"
  ],
  "appliances": [
    "air_fryer",
    "rice_cooker",
    "blender",
    "vacuum_cleaner",
    "coffee_maker",
    "toaster",
    "electric_fan"
  ],
  "textiles": [
    "cotton_bedding_set",
    "bath_towel",
    "duvet_cover",
    "throw_blanket",
    "pillow_cover"
  ],
  "global": [
    "kitchen_gadgets",
    "travel_accessories",
    "household_products",
    "reusable_water_bottle"
  ],
  "entertainment": [
    "bluetooth_speaker",
    "wireless_headphones",
    "wireless_earbuds",
    "mini_projector",
    "soundbar"
  ],
  "underwear": [
    "men_underwear",
    "women_underwear",
    "cotton_socks",
    "seamless_bra"
  ],
  "baby": [
    "baby_romper",
    "baby_stroller",
    "baby_bib",
    "baby_blanket",
    "baby_carrier"
  ],
  "improvement": [
    "hand_tool_set",
    "cordless_drill",
    "led_ceiling_light",
    "door_handle",
    "bathroom_faucet"
  ],
  "computers": [
    "laptop_computer",
    "wireless_mouse",
    "mechanical_keyboard",
    "computer_monitor",
    "usb_hub",
    "mini_pc",
    "webcam"
  ],
  "car": [
    "car_seat_cover",
    "car_floor_mat",
    "car_phone_holder",
    "car_vacuum_cleaner",
    "car_led_headlight"
  ]
};
for (const [category, terms] of Object.entries(EXTRA_SOURCES)) {
  sources[category] = [...(sources[category] ?? []), ...terms.map((term) => `https://www.alibaba.com/premium/${term}.html`)];
}
const PER_CATEGORY = 100;
// Source pages mix unrelated goods into their grids; require department fit.
const rules = {
  wigs: /wig|hair extension|hair bundle|lace frontal|lace closure/i,
  pets: /dog|cat|pet |puppy|kitten|litter|aquarium/i,
  sports: /yoga mat|dumbbell|barbell|treadmill|exercise bike|fitness equipment|weight bench|resistance band|kettlebell|gym equipment|pilates|punching bag/i,
  beauty: /makeup|lipstick|lip ?gloss|eyeshadow|mascara|blush|perfume|cosmetic|skin ?care|shampoo|conditioner|face cream|moisturiz|cleanser/i,
  accessories: /watch|bracelet|necklace|earring|sunglasses|jewelry|jewellery|ring\b|pendant|hair clip|belt/i,
  phones: /smartphone|smart phone|mobile phone|cell phone|cellphone/i,
  appliances: /kettle|cooker|blender|fryer|vacuum|heater|washing machine|refrigerator|coffee maker|toaster|steamer|electric grill|juicer|fan\b|humidifier/i,
  textiles: /bedding|towel|duvet|pillow|blanket|bed ?sheet|quilt|curtain|cushion cover|bedspread/i,
  entertainment: /speaker|headphone|earphone|earbud|soundbar|projector|television|smart tv|bluetooth.*audio/i,
  computers: /laptop|notebook|computer|keyboard|mouse|monitor|usb.*(drive|hub)|webcam|ssd|pendrive/i,
  general: /storage|organizer|organiser|cleaning|mop|brush|basket|bin\b|rack|shelf|shelv|container/i,
};
const unrelated = /veterinary|syringe|vaccine|livestock|hearing aid|deafness|medical|herbal.*tea|glow tea|lose weight|fat burning|hair growth|shop fittings|display furniture|prefab|pda\b|pos terminal|biometric|data collector|barcode|industrial|microscope|pcb|circuit|piano|musical|digital signage|advertising|video wall|injection mold|reborn|lifelike.*doll|sex doll|logistics agent|air freight|shipping agent|freight forward|kojic acid|rubber keypad|video rig|filmmaking/i;
const fitsCategory = (raw, category) => !unrelated.test(raw.title) &&
  (!rules[category] || rules[category].test(raw.title)) &&
  !(category === 'phones' && /holder|case\b|screen protector|charger|mini pc|motherboard|replacement|battery for|battery.*voltage|lcd.*assembly|repair|spare part/i.test(raw.title)) &&
  !(category === 'computers' && /control panel|control button|membrane switch|epoxy|rubber keyboard|keypad switch/i.test(raw.title)) &&
  !(category === 'beauty' && /tea\b|empty|packaging|bottle.*container/i.test(raw.title));
const capturedAt = new Date().toISOString();
const report = { capturedAt, source: 'Alibaba', maxProductsPerCategory: PER_CATEGORY, categories: [], failures: [] };
const previous = JSON.parse(await fs.readFile(new URL("alibaba-products.json", dataDir), "utf8"));
const products = [];
const seen = new Set(previous.map((p) => p.sourcing.productId));
const existingText = await fs.readFile(new URL('products.ts', dataDir), 'utf8');
const existing = [...existingText.matchAll(/^\s*(\{id:.*\}),?$/gm)].flatMap((m) => {
  try { return [Function(`return (${m[1]})`)()]; } catch { return []; }
});
const sourceId = (url) => url?.match(/_(\d+)\.html/)?.[1];
const previousIds = new Map(existing.filter((p) => sourceId(p.sourceUrl)).map((p) => [sourceId(p.sourceUrl), p.id]));
let queueIndex = 0;
async function worker() {
  while (queueIndex < categories.length) {
    const category = categories[queueIndex++];
    const pages = [];
    for (const url of sources[category.id] ?? []) {
      try {
        const response = await fetch(url, { headers: { 'accept-language': 'en' }, signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const parsed = parseProducts(await response.text());
        if (!parsed.length) throw new Error('No readable product data');
        pages.push({ url, parsed });
      } catch (error) { report.failures.push({ category: category.id, url, error: error.message }); }
    }
    const selected = previous.filter((p) => p.category === category.id);
    for (let i = 0; pages.some((p) => i < p.parsed.length) && selected.length < PER_CATEGORY; i++) {
      for (const page of pages) {
        if (selected.length >= PER_CATEGORY) break;
        const raw = page.parsed[i];
        if (!raw || !/^US \$/.test(raw.priceMini || raw.price) || !fitsCategory(raw, category.id)) continue;
        const id = sourceId(raw.url);
        if (!id || seen.has(id)) continue;
        const mapped = toShopProduct(raw, category.id, selected.length);
        if (!mapped || !isRetailViable(mapped, raw, category.id)) continue;
        const title = raw.title.replace(/\s+/g, ' ').trim();
        const product = { ...mapped, id: previousIds.get(id) ?? `alibaba-${id}`, title,
          description: `${title}. Supplier listing: ${raw.price || raw.priceMini} per ${raw.unit || 'unit'}.${raw.minOrder ? ` Supplier minimum order: ${raw.minOrder}.` : ''} Final price, availability and delivery costs require confirmation.`,
          sourceUrl: raw.url.split('?')[0],
          sourcing: { platform: 'alibaba', productId: id, originalTitle: raw.title, sourcePage: page.url, capturedAt,
            currency: 'USD', priceRange: raw.price, minimumOrder: raw.minOrder || null, unit: raw.unit || null,
            originalImage: raw.imageOriginal, priceStatus: 'estimate', usdPerGbp: 1.27, previewMarkup: markup },
        };
        delete product.supplierPriceUsd;
        delete product.minOrder;
        selected.push(product);
        seen.add(id);
      }
    }
    products.push(...selected);
    report.categories.push({ ...category, count: selected.length, pages: pages.map((p) => p.url) });
    console.log(`${category.id}: ${selected.length} products`);
  }
}
await Promise.all([worker(), worker(), worker()]);
const missing = categories.filter((c) => !products.some((p) => p.category === c.id));
await fs.writeFile(new URL('alibaba-sourcing-report.json', dataDir), JSON.stringify(report, null, 2) + '\n');
if (missing.length) throw new Error(`No products for: ${missing.map((c) => c.id).join(', ')}. Catalogue not written; see report.`);
products.sort((a, b) => categories.findIndex((c) => c.id === a.category) - categories.findIndex((c) => c.id === b.category) || a.id.localeCompare(b.id));
await fs.writeFile(new URL('alibaba-products.json', dataDir), JSON.stringify(products, null, 2) + '\n');
console.log(`Saved ${products.length} products across ${categories.length} categories to ${fileURLToPath(dataDir)}`);

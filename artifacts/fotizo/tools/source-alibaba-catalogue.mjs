// Frontend-only sourcing. Never connects to a database.
// Run from the repository root: node artifacts/fotizo/tools/source-alibaba-catalogue.mjs
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SOURCES, toShopProduct, isRetailViable } from './import-alibaba.mjs';
import { parseProducts } from './parse-alibaba-page.mjs';

const dataDir = new URL('../src/features/shop/data/', import.meta.url);
const categoryText = await fs.readFile(new URL('categories.ts', dataDir), 'utf8');
const categories = [...categoryText.matchAll(/\{ id: "([^"]+)", label: "([^"]+)"/g)].map((m) => ({ id: m[1], label: m[2] }));
const sources = { ...SOURCES,
  phones: ['https://www.alibaba.com/premium/best_selling_mobile_phones.html', 'https://www.alibaba.com/premium/android_smartphone.html', 'https://www.alibaba.com/premium/unlocked_mobile_phone.html', 'https://www.alibaba.com/premium/smartphone.html'],
  appliances: ['https://www.alibaba.com/premium/best_selling_home_appliances.html', 'https://www.alibaba.com/premium/electric_kettle.html'],
};
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
  !(category === 'phones' && /holder|case\b|screen protector|charger|mini pc/i.test(raw.title)) &&
  !(category === 'beauty' && /tea\b|empty|packaging|bottle.*container/i.test(raw.title));
const capturedAt = new Date().toISOString();
const report = { capturedAt, source: 'Alibaba', maxProductsPerCategory: 24, categories: [], failures: [] };
const products = [];
const seen = new Set();
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
    const selected = [];
    for (let i = 0; pages.some((p) => i < p.parsed.length) && selected.length < 24; i++) {
      for (const page of pages) {
        if (selected.length >= 24) break;
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
            originalImage: raw.imageOriginal, priceStatus: 'estimate', usdPerGbp: 1.27, previewMarkup: 2.2 },
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

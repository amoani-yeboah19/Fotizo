// Parse an Alibaba /premium/ or /showroom/ landing page into structured products.
//
//   node tools/parse-alibaba-page.mjs <url-or-file> [category-id]
//
// Why these pages and not search: Alibaba serves /trade/search and
// /product-detail behind a CAPTCHA, but the SEO landing pages under /premium/
// are rendered for crawlers and ship the product data as embedded JSON —
// title, price band, image list and product URL — with no challenge.
//
// Usage is one URL at a time; give it a page per Fotizo category.

import fs from "node:fs";
import { pathToFileURL } from "node:url";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function load(src) {
  if (!/^https?:/i.test(src)) return fs.readFileSync(src, "utf8");
  const res = await fetch(src, { headers: { "user-agent": UA, "accept-language": "en" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

const unesc = (s) =>
  (s || "")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const abs = (u) => (u?.startsWith("//") ? `https:${u}` : u);

/**
 * Alibaba serves `<base>.jpg_<w>x<h>.jpg`; the listing grid uses a 220px thumb.
 * Strip that to get the base, which is the untouched original.
 */
const baseImage = (u) => abs(u || "").replace(/_\d+x\d+(\.(?:jpg|jpeg|png|webp))$/i, "");

/**
 * Originals run 300KB–1.3MB, which is far too heavy for a product grid, so we
 * store the 720px rendition for display and keep the original alongside it.
 */
const DISPLAY_SIZE = "720x720";
const displayImage = (base) => (base ? `${base}_${DISPLAY_SIZE}.jpg` : base);

export function parseProducts(html) {
  const out = [];
  const seen = new Set();

  // Each card is a JSON object; slice on the image key that starts one.
  const chunks = html.split('{"image":{"multiImage":').slice(1);

  for (const chunk of chunks) {
    // Each chunk is one product object, ~12KB — most of it base64 tracking
    // payload, with title/price/url sitting past the 8KB mark. Read it whole;
    // a smaller window silently drops every field but the images.
    const window = chunk;

    const bases = (window.match(/^\s*\[([^\]]*)\]/) || [, ""])[1]
      .split(",")
      .map((s) => baseImage(unesc(s.replace(/^\s*"|"\s*$/g, ""))))
      .filter((u) => /alicdn\.com/.test(u));
    if (!bases.length) continue;
    const imgs = bases.map(displayImage);

    const title = unesc(
      (window.match(/"puretitle":"([^"]{5,300})"/) || window.match(/"title":"([^"]{5,300})"/) || [])[1],
    );
    if (!title) continue;

    const price = unesc((window.match(/"price":"([^"]{1,60})"/) || [])[1]);
    const priceMini = unesc((window.match(/"priceMini":"([^"]{1,40})"/) || [])[1]);
    const minOrder = unesc((window.match(/"minOrder":"([^"]{1,40})"/) || [])[1]);
    const unit = unesc((window.match(/"unit":"([^"]{1,24})"/) || [])[1]);
    const localPrice = unesc((window.match(/"localOriginalPriceRangeStr":"([^"]{1,60})"/) || [])[1]);
    const url = abs(unesc((window.match(/"productUrl":"([^"]{5,300})"/) || [])[1]));

    const key = bases[0];
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      title,
      price,
      priceMini,
      minOrder,
      unit,
      localPrice,
      image: imgs[0],
      images: imgs,
      imageOriginal: bases[0],
      url,
    });
  }
  return out;
}

/** Lowest number in a "US $9.80-$16.80" band — what we price the listing from. */
export function priceFrom(product) {
  const m = (product.priceMini || product.price || "").match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

// Only act as a CLI when run directly — import-alibaba.mjs imports parseProducts
// from here, and without this guard that import would consume its argv.
const isEntry = import.meta.url === pathToFileURL(process.argv[1] || "").href;
const [, , src, categoryId] = process.argv;
if (isEntry && src) {
  const html = await load(src);
  const products = parseProducts(html);
  if (categoryId) for (const p of products) p.category = categoryId;
  console.error(`parsed ${products.length} products from ${src}`);
  console.log(JSON.stringify(products, null, 2));
}

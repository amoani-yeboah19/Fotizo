// Build Fotizo shop listings from Alibaba /premium/ pages.
//
//   node tools/import-alibaba.mjs            # all categories
//   node tools/import-alibaba.mjs wigs pets  # just these
//
// Writes JSON to stdout. Pipe it to a file, then splice into
// src/features/shop/data/products.ts.
//
// The /premium/ pages are the only Alibaba surface that is readable without a
// CAPTCHA — /trade/search and /product-detail both challenge. See
// tools/parse-alibaba-page.mjs for the parser.

import { parseProducts } from "./parse-alibaba-page.mjs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Business inputs ──────────────────────────────────────────────────────────

/**
 * USD -> GBP. The catalogue stores GBP (see CurrencyContext); the app's own
 * rate table has USD at 1.27, so we divide by that to stay consistent with
 * whatever the currency switcher will show.
 */
const USD_TO_GBP = 1 / 1.27;

/**
 * Alibaba quotes WHOLESALE, and the low end of a band is the 1000-unit price.
 * Selling at that number would mean shipping goods at cost. This multiplier is
 * the retail markup covering freight, duty and margin.
 *
 * 2.2x is a placeholder standing in for a real landed-cost model — CONFIRM IT
 * before these prices go anywhere near a customer.
 */
const RETAIL_MARKUP = 2.2;

/** Products to take per category, after the retail-viability filter. */
const PER_CATEGORY = 40;

/**
 * Alibaba is a wholesale board, so a raw import drags in two kinds of listing
 * that cannot go on a consumer storefront:
 *
 *   - bulk commodities quoted per unit at enormous minimums (a 9p lollipop at
 *     500 cartons, poop bags at 5,000 units). The unit price is real but
 *     meaningless as a single-item listing.
 *   - B2B capital equipment (16kW solar arrays, Xeon workstations, commercial
 *     gym rigs) running to thousands of pounds.
 *
 * Keeping only what a retail customer could plausibly buy one of.
 */
const MIN_RETAIL_PRICE = 2;
const MAX_RETAIL_PRICE = 400;
const MAX_MOQ_UNITS = 200;

/**
 * Listings we will not carry. Alibaba's food and beauty pages are thick with
 * herbal products making medical claims — fertility, detox, slimming, breast
 * enhancement. Selling those means making the claim ourselves, which is a
 * regulated activity in every market Fotizo ships to. Not worth it for a
 * storefront filler product.
 */
const EXCLUDE_TERMS =
  /\b(fertility|womb|menstrua\w*|detox|colon|slimming|weight loss|breast (enlarge|enhance)\w*|penis|libido|aphrodisiac|hair regrow\w*|whitening injection|glutathione|anti[- ]?aging serum|cbd|nicotine|vape|e-?liquid|tobacco)\b/i;

/**
 * Rejected everywhere, whichever page they turned up on. These are not bad
 * products, they are simply not things a retail storefront sells:
 *
 *   - the listing sells a MANUFACTURING SERVICE (a blank tee, printed with
 *     your logo, 500 minimum) rather than a finished article;
 *   - industrial and PPE supply — hi-vis, safety harness, contract uniform;
 *   - contract/whole-room goods that collide with garment words by accident
 *     (a "linen" hotel curtain is not linen trousers).
 */
const NOT_RETAIL = new RegExp(
  [
    "blank|moq|sample|per kg|by the yard|logo printing|dtg|sublimation|screen print",
    "tee logo|logo tee|tshirt.{0,12}logo",
    // Raw material rather than a finished garment — cloth sold by the roll.
    // Suppliers misspell "reflective" often enough that the j/f slip is worth
    // matching; these are PPE, not menswear.
    "\\bfabrics?\\b|woven material|greige|by the roll|per yard|\\bgrams?\\b",
    "hi[- ]?vis|high visibility|ref[jf]ective|reflective|safety vest|uniform workwear|turnkey",
    "\\bbsci\\b|\\boeko\\b|\\bsedex\\b",
    "hotel textile|blackout|curtain",
    // Clinical goods: a surgical cast and a set of medical scrubs both match
    // ordinary garment words but are not things this shop sells.
    "surgical|orthopedic|orthopaedic|clubfoot|leg cast|catheter|incontinence|medical scrub|\\bscrubs?\\b",
  ].join("|"),
  "i",
);

/**
 * Per-department gates. `require` is the garment/part vocabulary a listing must
 * use to belong in that aisle; `reject` removes what the source pages reliably
 * leak in.
 *
 * These exist because Alibaba's category pages are loose: a men's trouser page
 * returns women's jumpsuits, a clothing page returns curtains, and every
 * apparel page returns printing blanks. Without a gate the department fills
 * with things a shopper did not come there for.
 */
/**
 * An aisle should not carry the neighbouring aisle's stock. Alibaba's clothing
 * pages mix them freely, so a listing is turned away when it names the OTHER
 * audience and not this one — "Men Sweater" on a womenswear page goes, while a
 * genuinely unisex "Men Women Knit" stays.
 */
const MENS_WORDS = /\b(men|mens|man|male|boys?)\b/i;
const WOMENS_WORDS = /\b(women|womens|woman|female|ladies|lady|girls?)\b/i;
const CHILD_WORDS = /\b(baby|babies|infant|toddler|newborn|kids?|child|children|nursery)\b/i;

const CATEGORY_RULES = {
  mens: {
    require: /\b(polo|shirt|tee|t-shirt|pants|trousers|chino|jean|denim|shorts?|sweater|jumper|cardigan|knit|knitted|knitwear|linen|suit|blazer|waistcoat)\b/i,
    // Outerwear has its own Jackets department; womenswear has its own aisle.
    reject: /\b(dress|skirt|jumpsuit|bib|two piece|overall|romper|bodysuit|bra|legging|crop top|camisole|blouse)\b/i,
    gate: (t) => !(WOMENS_WORDS.test(t) && !MENS_WORDS.test(t)) && !CHILD_WORDS.test(t),
  },
  womens: {
    reject: /\b(employee wear|working uniform|ems\b|muscle stimul)\b/i,
    require: /\b(dress|blouse|top|shirt|skirt|jumpsuit|romper|bodysuit|cardigan|sweater|knit|knitted|knitwear|pants|trousers|jean|shorts?|two piece|set|coat|camisole|playsuit)\b/i,
    gate: (t) =>
      !(MENS_WORDS.test(t) && !WOMENS_WORDS.test(t)) &&
      !CHILD_WORDS.test(t) &&
      !(/\bgirls?\b/i.test(t) && !/\bwomen|woman|ladies\b/i.test(t)),
  },
  baby: {
    require: /\b(baby|babies|infant|toddler|newborn|kids?|child|children|nappy|nappies|diaper|stroller|pram|pushchair|cot|crib|bib|onesie|romper|bodysuit|pacifier|teether|swaddle|carrier|high ?chair|car seat|bottle)\b/i,
    reject: /\b(adult|doll house)\b/i,
    // The nursery aisle is not the pet aisle — "training pad" and "puppy pad"
    // both match nappy vocabulary, and Pet Supplies is its own department.
    gate: (t) =>
      !/\b(puppy|dog|cat|pet)\b/i.test(t) &&
      !/\b(physiological|menstrual|period pant|mobility|walking assist)\b/i.test(t) &&
      // A title that is only sizes ("5month 6 Month 1-2 2-3 Xl Xxl") names no
      // product; require some actual words.
      t.split(/\s+/).filter((w) => /^[a-z]{3,}$/i.test(w)).length >= 3,
  },
  car: {
    require: /\b(car|auto|automotive|vehicle|truck|suv|tyre|tire|wheel|brake|engine|headlight|tail ?light|bumper|mirror|seat cover|dash ?cam|steering|wiper|spark plug|filter|floor mat|jump starter)\b/i,
    // The Autos department sells the vehicles; this aisle sells parts for them.
    // Industrial plant, not motoring: the tyre pages carry forklift and
    // skid-steer stock, and the parts pages carry warehouse storage.
    reject: /\b(electric vehicle|for sale|brand new car|sedan|forklift|skid steer|bobcat|loader|pallet|warehouse|industrial (rubber|tyre|tire))\b/i,
  },
  "shoes-bags": {
    require: /\b(shoes?|sneakers?|trainers?|boots?|sandals?|slippers?|loafers?|heels?|flats?|bag|handbag|backpack|tote|clutch|purse|wallet|luggage|suitcase|duffel|crossbody|satchel)\b/i,
    // Orthopaedic and recovery footwear dominates the boot listings, and the
    // bag pages carry shop fittings (display stands, bellman carts). Neither is
    // something a customer buys to wear or carry.
    reject: /\b(shoe (rack|cabinet|polish)|bag (making|machine)|packaging bag|garbage bag|walker|orthosis|orthotic|fixation|fracture|compression boot|recovery boot|massager?|reflexology|acupuncture|therapy|ankle support|display stand|bellman|luggage carrier|trolley|oilfield|float collar|shop furniture)\b/i,
  },
};

function isRetailViable(mapped, parsed, category) {
  if (mapped.price < MIN_RETAIL_PRICE || mapped.price > MAX_RETAIL_PRICE) return false;
  const moq = Number((parsed.minOrder || "").replace(/,/g, "").match(/\d+/)?.[0] ?? 1);
  if (Number.isFinite(moq) && moq > MAX_MOQ_UNITS) return false;
  if (EXCLUDE_TERMS.test(parsed.title)) return false;
  // Tested against the RAW title: tidyTitle strips words like "blank" and
  // "custom", so a cleaned title would hide exactly what we mean to catch.
  if (NOT_RETAIL.test(parsed.title)) return false;

  const rules = CATEGORY_RULES[category];
  if (rules) {
    if (rules.require && !rules.require.test(mapped.title)) return false;
    if (rules.reject && rules.reject.test(mapped.title)) return false;
    if (rules.gate && !rules.gate(mapped.title)) return false;
  }
  return true;
}

/**
 * Near-duplicate key. Suppliers list the same garment several times with the
 * words shuffled ("Mohair Sweater Men Long Sleeve" / "Men Sweater Mohair Long
 * Sleeve"), which an exact-title check lets through and a shopper reads as the
 * shop repeating itself. Sorting the significant words collapses those.
 */
const FILLER = new Set(["for","and","with","the","a","of","in","new","style","fashion","design","quality","men","mens","women","womens"]);
function titleSignature(title) {
  return [...new Set(
    title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !FILLER.has(w)),
  )].sort().slice(0, 6).join("|");
}

// ── Sources ──────────────────────────────────────────────────────────────────

export const SOURCES = {
  // Several pages per category: each /premium/ page caps at 40 listings and the
  // retail filter removes a good share, so one page cannot fill a packed aisle.
  wigs: [
    "https://www.alibaba.com/premium/full_lace_wig_vendors.html",
    "https://www.alibaba.com/premium/best_selling_hair_extensions.html",
    "https://www.alibaba.com/premium/best_selling_human_hair.html",
    "https://www.alibaba.com/premium/best_selling_wigs.html",
  ],
  pets: [
    "https://www.alibaba.com/premium/best_selling_pet_supplies.html",
    "https://www.alibaba.com/premium/best_selling_dog_products.html",
  ],
  // Menswear is sourced by GARMENT, not by the generic "men clothing" page.
  // That page (and the t-shirt/hoodie ones) returns printing blanks and
  // outerwear — outerwear already has its own Jackets department, and a wall
  // of blank tees is a supplier catalogue, not a shop. These pages give the
  // aisle the shirts, polos, knits and trousers a customer actually browses.
  mens: [
    "https://www.alibaba.com/premium/best_selling_polo_shirts.html",
    "https://www.alibaba.com/premium/best_selling_men_shirts.html",
    "https://www.alibaba.com/premium/best_selling_casual_shirts.html",
    "https://www.alibaba.com/premium/best_selling_linen_pants.html",
    "https://www.alibaba.com/premium/best_selling_men_trousers.html",
    "https://www.alibaba.com/premium/best_selling_chinos.html",
    "https://www.alibaba.com/premium/best_selling_knitwear.html",
    "https://www.alibaba.com/premium/best_selling_men_sweater.html",
    "https://www.alibaba.com/premium/best_selling_men_shorts.html",
  ],
  jackets: [
    "https://www.alibaba.com/premium/best_selling_winter_jackets.html",
    "https://www.alibaba.com/premium/best_selling_coats.html",
    "https://www.alibaba.com/premium/best_selling_down_jacket.html",
    "https://www.alibaba.com/premium/best_selling_winter_coats.html",
  ],
  // Both halves of the department, both genders. Deliberately NOT the generic
  // "boots" page — it returns orthopaedic walking boots and compression
  // therapy boots, which is medical supply rather than footwear.
  "shoes-bags": [
    "https://www.alibaba.com/premium/best_selling_women_shoes.html",
    "https://www.alibaba.com/premium/best_selling_men_shoes.html",
    "https://www.alibaba.com/premium/best_selling_casual_shoes.html",
    "https://www.alibaba.com/premium/best_selling_leather_shoes.html",
    "https://www.alibaba.com/premium/best_selling_sneakers.html",
    "https://www.alibaba.com/premium/best_selling_women_sandals.html",
    "https://www.alibaba.com/premium/best_selling_high_heels.html",
    "https://www.alibaba.com/premium/best_selling_handbags.html",
    "https://www.alibaba.com/premium/best_selling_women_bags.html",
    "https://www.alibaba.com/premium/best_selling_tote_bags.html",
    "https://www.alibaba.com/premium/best_selling_crossbody_bags.html",
    "https://www.alibaba.com/premium/best_selling_backpacks.html",
    "https://www.alibaba.com/premium/best_selling_wallets.html",
    "https://www.alibaba.com/premium/best_selling_luggage.html",
  ],
  // Sourced by garment, like menswear above. The generic women_clothing
  // page returns mostly unbranded bulk; these give the aisle the dresses,
  // tops, sets and knits a shopper actually browses.
  womens: [
    "https://www.alibaba.com/premium/best_selling_dresses.html",
    "https://www.alibaba.com/premium/best_selling_women_tops.html",
    "https://www.alibaba.com/premium/best_selling_blouses.html",
    "https://www.alibaba.com/premium/best_selling_skirts.html",
    "https://www.alibaba.com/premium/best_selling_jumpsuits.html",
    "https://www.alibaba.com/premium/best_selling_two_piece_set.html",
    "https://www.alibaba.com/premium/best_selling_women_pants.html",
    "https://www.alibaba.com/premium/best_selling_women_jeans.html",
    "https://www.alibaba.com/premium/best_selling_cardigans.html",
    "https://www.alibaba.com/premium/best_selling_women_knitwear.html",
  ],
  gymwear: [
    "https://www.alibaba.com/premium/best_selling_activewear.html",
    "https://www.alibaba.com/premium/best_selling_sportswear.html",
    "https://www.alibaba.com/premium/best_selling_gym_wear.html",
    "https://www.alibaba.com/premium/best_selling_leggings.html",
    "https://www.alibaba.com/premium/best_selling_yoga_wear.html",
  ],
  beauty: [
    "https://www.alibaba.com/premium/best_selling_beauty_products.html",
    "https://www.alibaba.com/premium/best_selling_skin_care.html",
    "https://www.alibaba.com/premium/best_selling_makeup.html",
    "https://www.alibaba.com/premium/best_selling_perfume.html",
  ],
  computers: [
    "https://www.alibaba.com/premium/best_selling_laptops.html",
    "https://www.alibaba.com/premium/best_selling_computer_accessories.html",
    "https://www.alibaba.com/premium/best_selling_keyboards.html",
    "https://www.alibaba.com/premium/best_selling_monitors.html",
  ],
  // Parts and fitted accessories. Whole vehicles belong to the Autos
  // department, and the generic "tires" page is forklift and skid-steer
  // stock, so car_tires is used instead.
  car: [
    "https://www.alibaba.com/premium/best_selling_car_accessories.html",
    "https://www.alibaba.com/premium/best_selling_car_parts.html",
    "https://www.alibaba.com/premium/best_selling_auto_parts.html",
    "https://www.alibaba.com/premium/best_selling_car_interior_accessories.html",
    "https://www.alibaba.com/premium/best_selling_car_seat_covers.html",
    "https://www.alibaba.com/premium/best_selling_car_lights.html",
    "https://www.alibaba.com/premium/best_selling_car_electronics.html",
    "https://www.alibaba.com/premium/best_selling_car_care.html",
    "https://www.alibaba.com/premium/best_selling_car_tires.html",
    "https://www.alibaba.com/premium/best_selling_car_wheels.html",
  ],
  // Clothing and gear both — a nursery aisle is prams and bottles as much
  // as babygrows, and one page of each keeps the grid from being all fabric.
  baby: [
    "https://www.alibaba.com/premium/best_selling_baby_clothes.html",
    "https://www.alibaba.com/premium/best_selling_kids_clothes.html",
    "https://www.alibaba.com/premium/best_selling_baby_shoes.html",
    "https://www.alibaba.com/premium/best_selling_baby_products.html",
    "https://www.alibaba.com/premium/best_selling_baby_toys.html",
    "https://www.alibaba.com/premium/best_selling_baby_stroller.html",
    "https://www.alibaba.com/premium/best_selling_diapers.html",
    "https://www.alibaba.com/premium/best_selling_baby_accessories.html",
  ],
  food: [
    "https://www.alibaba.com/premium/best_selling_coffee.html",
    "https://www.alibaba.com/premium/best_selling_beverages.html",
    "https://www.alibaba.com/premium/best_selling_honey.html",
    "https://www.alibaba.com/premium/best_selling_juice.html",
  ],
  "special-food": [
    "https://www.alibaba.com/premium/best_selling_dried_food.html",
    "https://www.alibaba.com/premium/best_selling_spices.html",
    "https://www.alibaba.com/premium/best_selling_nuts.html",
    "https://www.alibaba.com/premium/best_selling_dried_fruit.html",
  ],
  sports: [
    "https://www.alibaba.com/premium/best_selling_fitness_equipment.html",
    "https://www.alibaba.com/premium/best_selling_yoga_mat.html",
    "https://www.alibaba.com/premium/best_selling_sports_equipment.html",
    "https://www.alibaba.com/premium/best_selling_outdoor.html",
  ],
  improvement: [
    "https://www.alibaba.com/premium/best_selling_hand_tools.html",
    "https://www.alibaba.com/premium/best_selling_power_tools.html",
    "https://www.alibaba.com/premium/best_selling_hardware.html",
    "https://www.alibaba.com/premium/best_selling_led_lights.html",
  ],
  global: [
    "https://www.alibaba.com/premium/best_selling_products.html",
    "https://www.alibaba.com/premium/best_selling_gadgets.html",
    "https://www.alibaba.com/premium/best_selling_household_items.html",
    "https://www.alibaba.com/premium/best_selling_kitchen.html",
  ],
  accessories: [
    "https://www.alibaba.com/premium/best_selling_jewelry.html",
    "https://www.alibaba.com/premium/best_selling_watches.html",
    "https://www.alibaba.com/premium/best_selling_sunglasses.html",
  ],
  underwear: [
    "https://www.alibaba.com/premium/best_selling_underwear.html",
    "https://www.alibaba.com/premium/best_selling_socks.html",
    "https://www.alibaba.com/premium/best_selling_lingerie.html",
  ],
  textiles: [
    "https://www.alibaba.com/premium/best_selling_bedding.html",
    "https://www.alibaba.com/premium/best_selling_towels.html",
    "https://www.alibaba.com/premium/best_selling_curtains.html",
  ],
  entertainment: [
    "https://www.alibaba.com/premium/best_selling_speakers.html",
    "https://www.alibaba.com/premium/best_selling_headphones.html",
    "https://www.alibaba.com/premium/best_selling_smart_tv.html",
  ],
  general: [
    "https://www.alibaba.com/premium/best_selling_storage.html",
    "https://www.alibaba.com/premium/best_selling_cleaning_products.html",
  ],
};

// ── Title cleanup ────────────────────────────────────────────────────────────

// Alibaba titles are keyword-stuffed for search: comma-run listings, repeated
// terms, random capitals. Left alone they read as spam on a storefront.
function tidyTitle(raw) {
  let t = raw.replace(/\s+/g, " ").trim();

  // Keyword stuffing is comma-separated; the first clause is the actual product.
  const clauses = t.split(/\s*,\s*/).filter(Boolean);
  if (clauses.length > 1 && clauses[0].split(" ").length >= 4) t = clauses[0];

  // Drop trade boilerplate that means nothing to a retail buyer.
  t = t.replace(/\b(oem|odm|wholesale|factory (price|direct)|in stock|hot sale|best.?selling|top.?selling|new arrival|high quality|free shipping|custom logo|dropship\w*|private label)\b/gi, " ");
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();

  // Apparel listings lead with the factory's pitch rather than the garment:
  // a house SKU ("Mt2334"), the city, the fabric weight in GSM, and the offer
  // to print your logo on a blank. A shopper wants "Waffle Knit Polo Shirt",
  // so everything that is about the FACTORY rather than the GARMENT comes out.
  // Genuine descriptors (linen, waffle, oversized, embroidery, graphic) stay.
  t = t.replace(/\b[a-z]{2,3}\s?\d{3,}\b/gi, " ");            // house SKUs: Mt2334, DCY2026
  t = t.replace(/\b\d{2,4}\s?gsm\b/gi, " ");                  // fabric weights
  t = t.replace(/\b\d{2,4}\s?g\b/gi, " ");
  t = t.replace(/\b(19|20)\d{2}\b/g, " ");                    // season years
  t = t.replace(/\b(manufacturers?|manufacture|suppliers?|factory|trading|company|products?)\b/gi, " ");
  t = t.replace(/\b(guangzhou|shenzhen|dongguan|yiwu|fujian|zhejiang|china|chinese)\b/gi, " ");
  t = t.replace(/\b(customi[sz]ed?|custom|low moq|moq|blanks?|bulk|plain dyed|screen printed|printing)\b/gi, " ");
  t = t.replace(/\b(for (men|man)'?s?|men'?s? and women'?s?|unisex adult)\b/gi, " ");
  // The strips above can leave a dangling "for" ("Men's For Polo Shirts") and
  // the odd fabric weight in words rather than GSM.
  t = t.replace(/\b\d{2,4}\s?grams?\b/gi, " ");
  t = t.replace(/\bfor\s+(buyers?|sale)\b/gi, " ");
  t = t.replace(/('s|s)\s+for\s+/gi, "$1 ");
  t = t.replace(/\s+for\s*$/i, "");
  t = t.replace(/\b(direct[- ]sale|factory direct)\b/gi, " ");
  // Removing a word out of "factory-direct-sale" leaves the hyphen behind.
  // Only leading/trailing hyphens go, so "T-shirt" and "A-line" survive.
  t = t.replace(/(^|\s)-+/g, "$1").replace(/-+(?=\s|$)/g, "");
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();

  // Sellers repeat keywords to game search ("Lace Closure Wig ... Lace Closure
  // Curly Wigs ... Blend Human"). Keeping first occurrence of each word strips
  // the padding and usually leaves a readable phrase.
  const seen = new Set();
  t = t
    .split(" ")
    .filter((w) => {
      const key = w.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");

  // A backslash or dangling quote is always an artefact of the source markup
  // or of the word cap cutting mid-token; neither belongs in a product name.
  t = t.replace(/\\/g, " ").replace(/\s{2,}/g, " ").trim();
  // Listing codes like "#2" or "8a" mean nothing to a retail buyer.
  t = t.replace(/#\S+/g, " ").replace(/\s{2,}/g, " ").trim();

  // Title Case, keeping sizes (13x4, 26") and short acronyms (HD, 4K, USB).
  t = t
    .split(" ")
    .map((w) => {
      if (/^\d+(x\d+)?("|inch|cm|mm|g|kg|ml|l)?$/i.test(w)) return w.toLowerCase();
      if (/^[A-Z0-9]{2,4}$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");

  // Cap on words, not characters, so titles never end mid-phrase or in "…".
  const words = t.split(" ");
  if (words.length > 11) t = words.slice(0, 11).join(" ");
  return t.trim();
}

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

// ── Mapping ──────────────────────────────────────────────────────────────────

const money = (n) => Math.round(n * 100) / 100;

function toShopProduct(p, category, index) {
  const usdLow = Number((p.priceMini || p.price || "").match(/[\d.]+/)?.[0]);
  if (!Number.isFinite(usdLow) || usdLow <= 0) return null;

  const price = money(usdLow * USD_TO_GBP * RETAIL_MARKUP);
  const title = tidyTitle(p.title);
  if (!title || title.length < 8) return null;

  // Deliberately NOT deriving originalPrice from the top of Alibaba's band —
  // that band is a volume tier (1 unit vs 1000 units), not a markdown. Showing
  // it as a struck-through "was" price would invent a discount that never
  // existed. Equal values make discountPct() return 0 and the card omit it.
  const originalPrice = price;

  return {
    id: `ali-${category}-${slug(title).slice(0, 28)}-${index + 1}`,
    title,
    category,
    price,
    originalPrice,
    // Alibaba's listing pages carry no per-product rating or units-sold. These
    // stay 0 rather than being invented; ShopProductCard hides the row at 0.
    rating: 0,
    sold: 0,
    image: p.image,
    images: p.images.slice(0, 6),
    freeShipping: false,
    almostGone: false,
    description: buildDescription(title, p, category),
    sourceUrl: p.url,
    supplierPriceUsd: usdLow,
    minOrder: p.minOrder || null,
  };
}

// States only what the listing actually tells us. No invented specs, and no
// restating the title — the product page already shows it directly above.
function buildDescription(title, p, category) {
  const noun = CATEGORY_NOUN[category] || "item";
  const bits = [];

  // Pull the concrete attributes the seller actually stated in the title, so
  // each listing reads differently instead of every card sharing one blurb.
  const specs = [];
  const size = title.match(/\b\d+x\d+\b/);
  if (size) specs.push(`${size[0]} construction`);
  const length = title.match(/\b(\d+)\s*(?:inch|")\b/i);
  if (length) specs.push(`${length[1]} inches`);
  const density = title.match(/\b(\d{2,3})%\b/);
  if (density) specs.push(`${density[1]}% density`);
  const material = title.match(
    /\b(human hair|remy|synthetic|stainless steel|cotton|leather|silicone|bamboo|aluminium|aluminum|polyester|memory foam)\b/i,
  );
  if (material) specs.push(material[1].toLowerCase());

  bits.push(
    specs.length
      ? `${title} — ${specs.join(", ")}.`
      : `${title}, stocked for ${noun} buyers.`,
  );
  bits.push(
    `Imported through Fotizo's sourcing network so you get the supplier product without arranging the import yourself.`,
  );
  if (p.minOrder && !/^1 /.test(p.minOrder)) {
    bits.push(`The factory ships from ${p.minOrder}; we consolidate so you can buy single units.`);
  }
  bits.push("Quality-checked before dispatch, with tracked shipping and buyer protection.");
  return bits.join(" ");
}

const CATEGORY_NOUN = {
  gymwear: "activewear",
  wigs: "hair and wig",
  pets: "pet owners and",
  mens: "menswear",
  jackets: "outerwear",
  "shoes-bags": "footwear and bag",
  womens: "womenswear",
  beauty: "beauty",
  computers: "computing",
  car: "car accessory",
  baby: "parents and baby-product",
  food: "grocery",
  "special-food": "specialty food",
  sports: "fitness",
  improvement: "DIY and tool",
  global: "everyday",
};

// ── Run ──────────────────────────────────────────────────────────────────────

async function importCategory(category, source) {
  const urls = Array.isArray(source) ? source : [source];
  const pages = [];
  for (const url of urls) {
    // Transient DNS/connection drops are common on long runs; a page that fails
    // four times is skipped rather than aborting the whole category.
    let html = null;
    for (let a = 1; a <= 4 && html === null; a++) {
      try {
        const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en" } });
        if (!res.ok) break;
        html = await res.text();
      } catch {
        if (a < 4) await new Promise((r) => setTimeout(r, 3000 * a));
      }
    }
    if (html === null) { console.error(`    skip (unreachable): ${url}`); continue; }
    pages.push(parseProducts(html));
    if (urls.length > 1) await new Promise((r) => setTimeout(r, 1500));
  }

  // Round-robin rather than concatenate. Taken in page order, the first source
  // would fill the whole PER_CATEGORY quota and the department would be thirty
  // polo shirts; interleaving gives a shopper a mixed grid — a polo, a linen
  // trouser, a knit — which is the point of a department page.
  const parsed = [];
  for (let i = 0; pages.some((pg) => i < pg.length); i++) {
    for (const pg of pages) if (i < pg.length) parsed.push(pg[i]);
  }
  if (!parsed.length) throw new Error("no pages reachable");

  const out = [];
  const seenTitles = new Set();
  let rejected = 0;
  for (const p of parsed) {
    if (out.length >= PER_CATEGORY) break;
    const mapped = toShopProduct(p, category, out.length);
    if (!mapped) continue;
    if (!isRetailViable(mapped, p, category)) { rejected++; continue; }
    const key = titleSignature(mapped.title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    out.push(mapped);
  }
  return { items: out, rejected, available: parsed.length };
}

const wanted = process.argv.slice(2);
const targets = wanted.length ? wanted : Object.keys(SOURCES);
const all = {};

for (const cat of targets) {
  const url = SOURCES[cat];
  if (!url) {
    console.error(`skip ${cat}: no source configured`);
    continue;
  }
  try {
    const { items, rejected, available } = await importCategory(cat, url);
    all[cat] = items;
    console.error(
      `${items.length >= 8 ? "ok  " : "THIN"} ${cat.padEnd(13)} ${String(items.length).padStart(2)} kept  ` +
        `${String(rejected).padStart(2)} rejected of ${available}`,
    );
  } catch (e) {
    console.error(`FAIL ${cat.padEnd(13)} ${e.message}`);
    all[cat] = [];
  }
  await new Promise((r) => setTimeout(r, 800));
}

console.error(
  `\ntotal ${Object.values(all).reduce((n, a) => n + a.length, 0)} products  ` +
    `(USD->GBP ${USD_TO_GBP.toFixed(4)}, markup ${RETAIL_MARKUP}x)`,
);
console.log(JSON.stringify(all, null, 2));

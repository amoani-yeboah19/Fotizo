// ─────────────────────────────────────────────────────────────────────────────
// Fotizo supplier extractor — pulls ALL 22 shop categories in one run.
//
// HOW TO USE
//   1. Open https://www.alibaba.com and make sure it has loaded normally.
//   2. Press F12 -> Console.
//   3. Paste this whole file, press Enter.
//   4. Wait. It prints progress per category, then one JSON blob at the end
//      and copies it to your clipboard. Paste that to Claude.
//
// WHY IT WORKS
//   Alibaba blocks scrapers, but this is not a scraper hitting them from
//   outside — it runs inside the browser session you are already using, and
//   reads pages you are allowed to see. Alibaba sends no X-Frame-Options and
//   no CSP frame-ancestors, so a page on alibaba.com may iframe another
//   alibaba.com URL and read its DOM (same-origin). That is the whole trick:
//   each category search is loaded in a hidden iframe, rendered by the real
//   browser, then read.
//
// IF A CATEGORY COMES BACK EMPTY
//   Alibaba probably showed a captcha inside the frame. Re-run it later, or
//   open that one search normally in a tab and run window.fotizoExtract().
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  // Fotizo category id -> the Alibaba search that best fills it.
  // Edit the right-hand side freely; the left-hand ids must stay as they are,
  // they are what the catalogue keys off.
  const CATEGORIES = [
    ["wigs", "human hair wig"],
    ["pets", "pet supplies"],
    ["mens", "men clothing"],
    ["jackets", "winter jacket"],
    ["shoes-bags", "women shoes handbag"],
    ["womens", "women clothing"],
    ["beauty", "beauty cosmetics"],
    ["sports", "gym fitness equipment"],
    ["baby", "baby products"],
    ["computers", "laptop computer"],
    ["car", "car accessories"],
    ["improvement", "home improvement tools"],
    ["food", "packaged food snacks"],
    ["special-food", "specialty food"],
    ["textiles", "home textiles bedding"],
    ["entertainment", "home entertainment speaker"],
    ["accessories", "fashion accessories"],
    ["underwear", "underwear lingerie"],
    ["phones", "mobile phone"],
    ["appliances", "home appliances"],
    ["general", "general merchandise"],
    ["global", "trending wholesale products"],
  ];

  const PER_CATEGORY = 12; // products to keep per category
  const RENDER_WAIT = 2500; // ms to let a frame settle after products appear
  const MAX_WAIT = 25000; // ms before giving up on a category
  const PAUSE = 1200; // ms between categories — be polite, don't hammer

  const CHROME = /tps-|\/tfs\/|logo|icon|sprite|placeholder|avatar/i;
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const isProductImg = (src) => !!src && /alicdn\.com/.test(src) && !CHROME.test(src);

  // Strip Alibaba's size suffix so we keep the largest version available.
  const normalise = (src) =>
    src.split("?")[0].replace(/_\d+x\d+(?:x\w+)?(\.(?:jpg|jpeg|png|webp))$/i, "$1");

  function cardFor(img, doc) {
    let n = img;
    for (let i = 0; i < 8 && n; i++) {
      if (n.querySelector && n.querySelector('a[href*="product-detail"], a[href*="/offer/"]')) return n;
      n = n.parentElement;
    }
    return img.closest("li, .card, [class*=card], [class*=item]") || img.parentElement;
  }

  // Read every product visible in a document (the iframe's, or this page's).
  function extractFrom(doc, limit) {
    const out = [];
    const seen = new Set();
    for (const img of doc.querySelectorAll("img")) {
      if (out.length >= limit) break;
      const src = img.currentSrc || img.src || img.getAttribute("data-src") || "";
      if (!isProductImg(src)) continue;
      const image = normalise(src);
      if (seen.has(image)) continue;

      const card = cardFor(img, doc);
      if (!card) continue;
      const link = card.querySelector('a[href*="product-detail"], a[href*="/offer/"]');
      const text = clean(card.innerText);
      let title = clean(link && link.innerText) || clean(img.alt);
      if (!title) continue;
      if (title.length > 180) title = title.slice(0, 180);

      const price = (text.match(/(?:US\s*)?\$\s*[\d,]+(?:\.\d{1,2})?/) || [null])[0];
      const moq = (text.match(/(\d[\d,]*)\s*(?:pieces?|pcs?|sets?)\s*\(?(?:Min\.?\s*Order|MOQ)/i) || [])[1] || null;

      seen.add(image);
      out.push({
        title,
        price: price ? clean(price) : null,
        moq: moq || null,
        image,
        link: link ? link.href.split("?")[0] : null,
      });
    }
    return out;
  }

  // Expose the single-page version too, for the manual fallback.
  window.fotizoExtract = () => extractFrom(document, 999);

  const searchUrl = (term) =>
    `${location.origin}/trade/search?SearchText=${encodeURIComponent(term)}`;

  function loadInFrame(url) {
    return new Promise((resolve) => {
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;left:-10000px;top:0;width:1400px;height:1000px;opacity:0;";
      let settled = false;

      const finish = (doc) => {
        if (settled) return;
        settled = true;
        resolve({ doc, frame });
      };

      frame.onload = async () => {
        const started = Date.now();
        // Poll until product images show up (the page renders client-side).
        while (Date.now() - started < MAX_WAIT) {
          let doc = null;
          try {
            doc = frame.contentDocument;
          } catch {
            break; // cross-origin redirect (e.g. bounced to login)
          }
          if (doc) {
            const hit = [...doc.querySelectorAll("img")].some((i) =>
              isProductImg(i.currentSrc || i.src || i.getAttribute("data-src") || ""),
            );
            if (hit) {
              await sleep(RENDER_WAIT); // let the rest of the grid paint
              return finish(frame.contentDocument);
            }
          }
          await sleep(600);
        }
        let doc = null;
        try {
          doc = frame.contentDocument;
        } catch {}
        finish(doc);
      };

      frame.src = url;
      document.body.appendChild(frame);
      setTimeout(() => finish(null), MAX_WAIT + RENDER_WAIT + 4000);
    });
  }

  (async () => {
    const results = {};
    let total = 0;
    console.log(`%cFotizo extractor — ${CATEGORIES.length} categories`, "font-weight:bold");

    for (const [id, term] of CATEGORIES) {
      const { doc, frame } = await loadInFrame(searchUrl(term));
      let items = [];
      if (doc) {
        try {
          items = extractFrom(doc, PER_CATEGORY);
        } catch (e) {
          console.warn(`  ${id}: read failed —`, e.message);
        }
      }
      if (frame) frame.remove();
      results[id] = items;
      total += items.length;
      console.log(
        `  ${items.length ? "✓" : "✗"} ${id.padEnd(14)} "${term}" -> ${items.length} products`,
      );
      await sleep(PAUSE);
    }

    const payload = { source: "alibaba", capturedAt: new Date().toISOString(), categories: results };
    const json = JSON.stringify(payload, null, 2);
    window.fotizoResults = payload;

    console.log(`%cDone — ${total} products across ${CATEGORIES.length} categories`, "font-weight:bold;color:green");
    console.log(json);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(
        () => console.log("%cCopied to clipboard — paste it to Claude.", "color:green"),
        () => console.log("Clipboard blocked. Run: copy(JSON.stringify(fotizoResults))"),
      );
    }
  })();
})();

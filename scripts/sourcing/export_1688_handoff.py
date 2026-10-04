"""Export sanitized category checkpoints into an offline, unpublished handoff.

Usage: python3 scripts/sourcing/export_1688_handoff.py CHECKPOINT_DIR OUTPUT_DIR
No network or database connection is used. Supplier text is data, not instructions.
"""

import csv
import hashlib
import json
import sys
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from urllib.parse import urlencode

CATEGORIES = {
    "mens": "Men's Clothing",
    "womens": "Women's Clothing",
    "underwear": "Underwear",
    "gymwear": "Gym Wear",
    "shoes-bags": "Shoes & Bags",
}


def export(source: Path, destination: Path):
    destination.mkdir(parents=True, exist_ok=True)
    products = {}
    coverage = []
    for category, label in CATEGORIES.items():
        checkpoint = json.loads((source / f"{category}-crawl.json").read_text())
        assert checkpoint["category"] == category
        pages = checkpoint["pages"]
        assert [p["page"] for p in pages] == list(range(1, len(pages) + 1))
        coverage.append({
            "category": category,
            "label": label,
            "searchTerm": checkpoint["query"],
            "searchUrl": "https://www.1688.com/zw/page.html?" + urlencode({"hpageId": "old-sem-pc-list", "keywords": checkpoint["query"]}),
            "uniqueProducts": len(checkpoint["products"]),
            "pagesAttempted": len(pages),
            "visiblePageRangeCompleted": len(pages) == 50 and not any(p["error"] for p in pages),
            "wholeCategoryComplete": False,
            "stopReason": checkpoint["stopReason"],
            "pages": pages,
        })
        for row in checkpoint["products"]:
            product_id = row["productId"]
            assert product_id.isdigit()
            assert row["platform"] == "1688" and row["supplierCurrency"] == "CNY"
            assert row["sourceUrl"] == f"https://detail.1688.com/offer/{product_id}.html"
            observation = {k: row[k] for k in (
                "proposedCategory", "sourcePage", "sourceBatch", "capturedAt",
                "supplierPrice", "displayedPrice", "promotionType",
            )}
            if product_id in products:
                existing = products[product_id]
                existing["sourceObservations"].append(observation)
                if category not in existing["sourceCategories"]:
                    existing["sourceCategories"].append(category)
                continue
            try:
                cost = Decimal(row["supplierPrice"] or "NaN")
                valid_price = cost.is_finite() and cost > 0
            except InvalidOperation:
                valid_price = False
            estimate = str((cost * Decimal("1.30")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) if valid_price else None
            products[product_id] = {
                "externalKey": f"1688:{product_id}",
                "platform": "1688",
                "productId": product_id,
                "originalTitle": row["originalTitle"],
                "englishTitle": None,
                "englishDescription": None,
                "translationStatus": "pending",
                "proposedCategory": category,
                "sourceCategories": [category],
                "categoryReviewStatus": "pending",
                "supplierCurrency": "CNY",
                "supplierPrice": row["supplierPrice"],
                "markupPercent": 30,
                "estimatedSellingPriceCny": estimate,
                "sellingPriceGbp": None,
                "exchangeRate": None,
                "priceStatus": "estimate-requires-supplier-confirmation" if valid_price else "invalid-price-review-required",
                "imageUrls": [row["image"]] if row["image"] else [],
                "imageReviewStatus": "pending",
                "supplierUnit": row["supplierUnit"],
                "minimumOrder": row["minimumOrder"],
                "sourceUrl": row["sourceUrl"],
                "capturedAt": row["capturedAt"],
                "sourceObservations": [observation],
                "status": "draft",
                "publishable": False,
            }

    ordered = sorted(products.values(), key=lambda p: int(p["productId"]))
    def write_json(name, data):
        (destination / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

    write_json("products.json", ordered)
    write_json("coverage.json", coverage)
    columns = ["externalKey", "proposedCategory", "sourceCategories", "originalTitle", "englishTitle", "englishDescription", "supplierCurrency", "supplierPrice", "markupPercent", "estimatedSellingPriceCny", "sourceUrl", "imageUrls", "translationStatus", "categoryReviewStatus", "priceStatus", "status"]
    with (destination / "review.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for product in ordered:
            values = {}
            for key in columns:
                value = product[key]
                if isinstance(value, list):
                    value = " | ".join(value)
                # Supplier-controlled spreadsheet text must not execute formulas.
                if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@")):
                    value = "'" + value
                values[key] = value
            writer.writerow(values)
    files = {}
    for name in ["products.json", "coverage.json", "review.csv"]:
        files[name] = {"sha256": hashlib.sha256((destination / name).read_bytes()).hexdigest()}
    manifest = {
        "schemaVersion": 1,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "platform": "1688",
        "publicationStatus": "unpublished-backend-review-only",
        "uniqueProducts": len(ordered),
        "categoryMemberships": sum(len(p["sourceCategories"]) for p in ordered),
        "translationPending": sum(p["translationStatus"] == "pending" for p in ordered),
        "invalidPriceCount": sum(p["estimatedSellingPriceCny"] is None for p in ordered),
        "missingImageCount": sum(not p["imageUrls"] for p in ordered),
        "wholeCategoryComplete": False,
        "coverageNote": "Captured public promotional search results. The site's pagination displays a 50-page window, not a verified count of all supplier products. Scroll batches stop when an identical result set repeats. Search rankings and prices can change.",
        "categories": [{k: v for k, v in c.items() if k != "pages"} for c in coverage],
        "files": files,
    }
    write_json("manifest.json", manifest)
    print(json.dumps({k: v for k, v in manifest.items() if k not in ("files", "categories")}, indent=2))


if __name__ == "__main__":
    export(Path(sys.argv[1]), Path(sys.argv[2]))

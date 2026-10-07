"""Prepare the owner's shoe searches for the frontend; never invent SKUs or stock."""
import argparse
import concurrent.futures
import csv
import hashlib
import io
import json
import re
import urllib.parse
import urllib.request
import urllib.error
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from PIL import Image

CAPTURE = Path('/tmp/fotizo-1688-shoes-2026-10-07')
OUT = Path('docs/sourcing/1688-shoes-2026-10-07')
DATA = Path('artifacts/fotizo/src/features/shop/data')
IMAGES = Path('artifacts/fotizo/public/images/1688-shoes')
CATEGORIES = ['loafers', 'running-shoes', 'sports-shoes']
EXCLUDED = r'鞋垫|鞋盒|鞋撑|鞋刷|鞋套(?!脚)|鞋花|鞋模|鞋架|鞋柜|清洁剂|宠物|狗鞋'
TYPES = [
    (r'玛丽珍', 'Mary Jane Shoes'), (r'豆豆鞋|开车鞋', 'Driving Loafers'),
    (r'乐福|洛夫', 'Loafers'), (r'正装|商务.*皮鞋', 'Dress Shoes'),
    (r'登山鞋|徒步鞋', 'Hiking Shoes'), (r'篮球鞋', 'Basketball Shoes'),
    (r'足球鞋', 'Football Boots'), (r'网球鞋', 'Tennis Shoes'),
    (r'洞洞鞋', 'Clogs'), (r'健步鞋|老人鞋|妈妈鞋', 'Walking Shoes'),
    (r'太极鞋|训练鞋|作训鞋|军训鞋', 'Training Shoes'),
    (r'跑步鞋|跑鞋|跑步版鞋|莆田鞋.*跑步', 'Running Shoes'), (r'运动鞋|德训鞋|板鞋|老爹鞋|小白鞋|阿甘鞋|袜子鞋|气垫鞋', 'Trainers'),
    (r'帆布鞋', 'Canvas Shoes'), (r'凉鞋', 'Sandals'), (r'拖鞋', 'Slippers'),
    (r'劳保鞋|工作鞋', 'Work Shoes'), (r'皮鞋', 'Dress Shoes'),
    (r'平底鞋|芭蕾', 'Flat Shoes'), (r'靴', 'Boots'),
    (r'休闲鞋|单鞋|男鞋|女鞋|童鞋|网面鞋|棉鞋|薄底鞋', 'Casual Shoes'),
]
FEATURES = [
    (r'网面|网纱', 'Mesh', 'Mesh upper'),
    (r'一脚蹬|套脚|懒人', 'Slip-On', 'Slip-on style'),
    (r'系带', 'Lace-Up', 'Lace-up style'),
    (r'厚底', 'Chunky-Sole', 'Chunky sole'),
    (r'加绒|棉里', 'Fleece-Lined', 'Lined design'),
]

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def existing_ids():
    return {p['id'] for f in DATA.glob('*products.json') if f.name != '1688-shoes-products.json'
            for p in json.loads(f.read_text()) if isinstance(p, dict) and 'id' in p}

def english(title):
    if re.search(EXCLUDED, title):
        return None, None, [], 'not-a-human-footwear-listing'
    kind = next((name for pattern, name in TYPES if re.search(pattern, title)), None)
    if not kind:
        return None, None, [], 'product-identification-pending'
    child = bool(re.search(r'童鞋|儿童|男童|女童|宝宝|婴儿', title))
    audience = 'Children’s' if child else ('Unisex' if '男女' in title or '情侣' in title else
               'Women’s' if '女' in title and '男' not in title else 'Men’s' if '男' in title and '女' not in title else '')
    attrs = [(name, detail) for pattern, name, detail in FEATURES if re.search(pattern, title)]
    name = ' '.join([x for x in [audience, *(a[0] for a in attrs[:3]), kind] if x])
    specs = [{'label': 'Product type', 'value': kind}]
    if audience:
        specs.append({'label': 'Style for', 'value': audience})
    specs.extend({'label': 'Design detail', 'value': detail} for _, detail in attrs)
    description = name + '.'
    if attrs:
        description += ' Source-described details include ' + ', '.join(a[1].lower() for a in attrs) + '.'
    description += ' Confirm the selected size, fit and included items before ordering.'
    return name, description, specs, None

def prepare():
    products, coverage = {}, []
    existing = existing_ids()
    for category in CATEGORIES:
        capture = json.loads((CAPTURE / (category + '-crawl.json')).read_text())
        coverage.append({k: v for k, v in capture.items() if k != 'products'})
        for row in capture['products']:
            ident = row['productId']
            if ident in products:
                if category not in products[ident]['sourceCategories']:
                    products[ident]['sourceCategories'].append(category)
                continue
            title, description, specs, hold = english(row['originalTitle'])
            if '1688-' + ident in existing:
                hold = 'already-in-existing-catalogue'
            try:
                cost = Decimal(str(row['supplierPrice']))
                if not cost.is_finite() or cost <= 0:
                    raise ValueError()
            except Exception:
                hold = hold or 'invalid-price'
            products[ident] = {**row, 'sourceCategories': [category], 'proposedCategory': 'shoes-bags',
                'englishTitle': title, 'englishDescription': description, 'specifications': specs,
                'translationStatus': 'source-derived-english-draft' if title else 'pending',
                'publishable': False, 'reviewHold': hold}
    write(OUT / 'products.json', list(products.values()))
    write(OUT / 'coverage.json', coverage)
    print('Captured unique:', len(products), 'initial holds:', dict(Counter(r['reviewHold'] for r in products.values() if r['reviewHold'])))

def download(row):
    ident = row['productId']
    path = IMAGES / (ident + '.webp')
    if path.exists():
        return ident, 'saved'
    url = row.get('image') or ''
    if url.startswith('//'):
        url = 'https:' + url
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or not (parsed.hostname or '').endswith('.alicdn.com'):
        return ident, 'unapproved-image-url'
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.1688.com/'})
        with urllib.request.urlopen(request, timeout=25) as response:
            data = response.read(12_000_001)
        if len(data) > 12_000_000:
            return ident, 'image-too-large'
        with Image.open(io.BytesIO(data)) as image:
            image.load()
            image.thumbnail((1000, 1000))
            image.convert('RGB').save(path.with_suffix('.tmp'), 'WEBP', quality=83)
        path.with_suffix('.tmp').replace(path)
        return ident, 'saved'
    except urllib.error.HTTPError as error:
        return ident, 'HTTP-' + str(error.code)
    except Exception as error:
        return ident, type(error).__name__

def images():
    IMAGES.mkdir(parents=True, exist_ok=True)
    rows = [r for r in json.loads((OUT / 'products.json').read_text()) if not r['reviewHold']]
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for index, (ident, status) in enumerate(pool.map(download, rows), 1):
            results[ident] = status
            if index % 100 == 0:
                print('Images:', index, 'saved:', sum(x == 'saved' for x in results.values()), flush=True)
    write(OUT / 'image-results.json', results)
    print('Images complete:', dict(Counter(results.values())), flush=True)

def export():
    rate = json.loads(Path('/private/tmp/fotizo-shoes-rates.json').read_text())
    assert rate['result'] == 'success' and rate['base_code'] == 'GBP'
    cny = Decimal(str(rate['rates']['CNY']))
    assert cny.is_finite() and cny > 0
    pricing = {'supplierCurrency': 'CNY', 'baseCurrency': 'GBP', 'cnyPerGbp': float(cny),
        'markupPercent': 30, 'rateDate': rate['time_last_update_utc'],
        'rateSource': 'https://open.er-api.com/v6/latest/GBP', 'priceStatus': 'estimate'}
    rows = json.loads((OUT / 'products.json').read_text())
    output, held = [], []
    existing = existing_ids()
    for row in rows:
        ident = row['productId']
        reason = row['reviewHold']
        if '1688-' + ident in existing:
            reason = 'already-in-existing-catalogue'
        price = None
        if not reason:
            try:
                with Image.open(IMAGES / (ident + '.webp')) as image:
                    image.verify()
                price = float((Decimal(row['supplierPrice']) * Decimal('1.30') / cny).quantize(Decimal('.01'), rounding=ROUND_HALF_UP))
                assert price > 0
            except Exception:
                reason = 'image-or-price-verification-failed'
        row.update(frontendStatus='held' if reason else 'included', frontendHoldReason=reason,
                   sellingPriceGbp=price, exchangeRate=pricing)
        if reason:
            held.append({'id': ident, 'reason': reason})
            continue
        image = '/images/1688-shoes/' + ident + '.webp'
        output.append({'id': '1688-' + ident, 'title': row['englishTitle'], 'description': row['englishDescription'],
            'category': 'shoes-bags', 'price': price, 'originalPrice': price, 'image': image, 'images': [image],
            'rating': 0, 'sold': 0, 'freeShipping': False, 'almostGone': False, 'requiresPublication': True,
            'specifications': row['specifications']})
    write(DATA / '1688-shoes-products.json', output)
    write(DATA / '1688-shoes-pricing.json', pricing)
    write(OUT / 'products.json', rows)
    write(OUT / 'held-products.json', held)
    columns = ['productId', 'sourceCategories', 'originalTitle', 'englishTitle', 'supplierPrice', 'sellingPriceGbp', 'sourceUrl', 'frontendStatus', 'frontendHoldReason']
    with (OUT / 'review.csv').open('w', encoding='utf-8-sig', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            data = {k: ' | '.join(row[k]) if isinstance(row[k], list) else row[k] for k in columns}
            for key, value in data.items():
                if isinstance(value, str) and value.lstrip().startswith(('=', '+', '-', '@')):
                    data[key] = "'" + value
            writer.writerow(data)
    coverage = json.loads((OUT / 'coverage.json').read_text())
    summary = [{'category': c['category'], 'pagesAttempted': len(c['pages']),
        'successfulPages': sum(not p['error'] for p in c['pages']), 'completeVisibleWindow': c['complete'],
        'stopReason': c['stopReason']} for c in coverage]
    manifest = {'capturedUnique': len(rows), 'frontendAdded': len(output), 'held': len(held),
        'heldReasons': dict(Counter(r['reason'] for r in held)), 'categories': summary,
        'all1688Inventory': False, 'checkoutEnabled': False, 'pricing': pricing,
        'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [OUT / 'products.json', OUT / 'coverage.json', OUT / 'review.csv', DATA / '1688-shoes-products.json']}}
    write(OUT / 'manifest.json', manifest)
    print(json.dumps(manifest, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('step', choices=['prepare', 'images', 'export'])
    args = parser.parse_args()
    {'prepare': prepare, 'images': images, 'export': export}[args.step]()

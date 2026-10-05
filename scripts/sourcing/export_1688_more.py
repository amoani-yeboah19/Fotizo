"""Publish the verified local-photo subset as frontend-only sourced listings.
Private sourcing metadata remains in docs; no supplier URL enters the public JSON.
"""
import csv, hashlib, json
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from PIL import Image
ROOT=Path('docs/sourcing/1688-more-2026-10-05')
DATA=Path('artifacts/fotizo/src/features/shop/data')
PUBLIC=Path('artifacts/fotizo/public')
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def export():
 rows=json.loads((ROOT/'products.json').read_text())
 rate=json.loads(Path('/tmp/fotizo-more-rates.json').read_text());assert rate['result']=='success' and rate['base_code']=='GBP'
 cny=Decimal(str(rate['rates']['CNY']));assert cny>0
 pricing={'supplierCurrency':'CNY','baseCurrency':'GBP','cnyPerGbp':float(cny),'markupPercent':30,'rateDate':rate['time_last_update_utc'],'rateSource':'https://open.er-api.com/v6/latest/GBP','priceStatus':'estimate'}
 existing={p['id'] for name in ['1688-products.json','1688-detail-products.json','1688-home-products.json'] for p in json.loads((DATA/name).read_text())}
 out=[];held=[];image_results={}
 for row in rows:
  ident=row['productId']; path=PUBLIC/'images/1688-more'/f'{ident}.webp'; reason=row.get('reviewHold')
  if not row['englishTitle']:reason=reason or 'english-product-identification-pending'
  try:
   cost=Decimal(row['supplierPrice']);assert cost.is_finite() and cost>0
   price=float((cost*Decimal('1.30')/cny).quantize(Decimal('.01'),rounding=ROUND_HALF_UP));assert price>0
  except Exception:reason=reason or 'invalid-price';price=None
  if '1688-'+ident in existing:reason='already-in-existing-catalogue'
  if not path.exists():reason=reason or 'image-not-saved'
  else:
   try:
    with Image.open(path) as image:image.verify()
   except Exception:reason=reason or 'invalid-image'
  image_results[ident]='saved-and-decoded' if path.exists() and reason!='invalid-image' else 'missing-or-invalid'
  row['frontendStatus']='held' if reason else 'included';row['frontendHoldReason']=reason
  row['sellingPriceGbp']=price;row['exchangeRate']=pricing
  if reason:held.append({'id':ident,'reason':reason});continue
  image=f'/images/1688-more/{ident}.webp'
  out.append({'id':'1688-'+ident,'title':row['englishTitle'],'description':row['englishDescription'],'category':row['proposedCategory'],'price':price,'originalPrice':price,'image':image,'images':[image],'rating':0,'sold':0,'freeShipping':False,'almostGone':False,'requiresPublication':True,'specifications':row['specifications']})
 write(DATA/'1688-more-products.json',out);write(DATA/'1688-more-pricing.json',pricing)
 write(ROOT/'products.json',rows);write(ROOT/'held-products.json',held);write(ROOT/'image-results.json',image_results)
 cols=['productId','sourceCategories','proposedCategory','originalTitle','englishTitle','englishDescription','supplierCurrency','supplierPrice','sellingPriceGbp','sourceUrl','frontendStatus','frontendHoldReason']
 with (ROOT/'review.csv').open('w',newline='',encoding='utf-8-sig') as f:
  writer=csv.DictWriter(f,fieldnames=cols,lineterminator='\n');writer.writeheader()
  for row in rows:
   r={k:row.get(k) for k in cols}
   for k,v in r.items():
    if isinstance(v,list):r[k]=' | '.join(v)
    if isinstance(r[k],str) and r[k].lstrip().startswith(('=','+','-','@')):r[k]="'"+r[k]
   writer.writerow(r)
 coverage=json.loads((ROOT/'coverage.json').read_text())
 summary=[]
 for c in coverage:
  good=[p['page'] for p in c['pages'] if not p['error']]
  summary.append({'sourceCategory':c['category'],'query':c['query'],'pagesAttempted':len(c['pages']),'successfulPages':len(good),'visibleWindowCompleted':good==list(range(1,51)),'captured':sum(c['category'] in r['sourceCategories'] for r in rows),'frontendIncluded':sum(c['category'] in r['sourceCategories'] and r['frontendStatus']=='included' for r in rows),'stopReason':c['stopReason']})
 manifest={'capturedUnique':len(rows),'frontendAdded':len(out),'held':len(held),'heldReasons':dict(Counter(r['reason'] for r in held)),'categories':summary,'frontendCategories':dict(Counter(p['category'] for p in out)),'pricing':pricing,'all1688Inventory':False,'checkoutEnabled':False,'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'products.json',ROOT/'coverage.json',ROOT/'review.csv',DATA/'1688-more-products.json']}}
 write(ROOT/'manifest.json',manifest);print(json.dumps(manifest,indent=2))
if __name__=='__main__':export()

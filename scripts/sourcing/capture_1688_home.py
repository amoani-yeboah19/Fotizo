import concurrent.futures,hashlib,time,urllib.parse,subprocess,json,pathlib,re,html,datetime
# Public search results only; no login, cookies or CAPTCHA handling.
ROOT=pathlib.Path('/tmp/fotizo-1688-home-2026-10-05');ROOT.mkdir(exist_ok=True)
CATS={'pets-garden':'宠物及园艺','daily-essentials':'日用百货','hair-styling':'美发造型市场','home-cleaning':'家庭清洁市场','computers':'数码/电脑','car-accessories':'汽车用品','home-appliances':'家用电器'}
def request(category,query,page,batch):
 salt=str(time.time_ns()//1000000)+'1'
 args={'keywords':query,'beginpage':page,'asyncreq':batch,'salt':salt,'sign':hashlib.md5(('pcsem'+query+salt+'csb44T%34CiKj&FyRbCBJ').encode()).hexdigest(),'callback':'fotizoImport'}
 url='https://data.p4psearch.1688.com/data/ajax/get_premium_offer_list.json?'+urllib.parse.urlencode(args)
 result=subprocess.run(['curl','-sS','--retry','2','--retry-delay','2','--retry-all-errors','--max-time','30','-H','Referer: https://www.1688.com/',url],capture_output=True)
 if result.returncode:raise RuntimeError('network timeout/error')
 raw=result.stdout.decode(errors='replace').strip()
 if not raw.startswith('fotizoImport('):raise RuntimeError('unexpected response; access may be restricted')
 obj=json.JSONDecoder().raw_decode(raw[len('fotizoImport('):])[0]
 content=obj.get('data',{}).get('content')
 if not isinstance(content,dict) or 'offerResult' not in content:raise RuntimeError('product data missing')
 rows=[]
 for r in content['offerResult']:
  offer=str(r.get('offerid') or r.get('offerId') or '')
  if not offer.isdigit():continue
  discount=r.get('discountPrice') or {}
  standard=discount.get('price') or (r.get('priceMoney') or {}).get('amount') or r.get('strPriceMoney')
  rows.append({'platform':'1688','productId':offer,'originalTitle':html.unescape(re.sub('<[^>]+>','',r.get('title') or r.get('subject') or '')),'proposedCategory':category,'supplierCurrency':'CNY','supplierPrice':str(standard) if standard is not None else None,'displayedPrice':str(r.get('strPriceMoney') or ''),'promotionType':discount.get('zkCat') or None,'image':r.get('imgUrl'),'sourceUrl':f'https://detail.1688.com/offer/{offer}.html','supplierUnit':r.get('unit') or None,'minimumOrder':r.get('quantityBegin') or None,'sourcePage':page,'sourceBatch':batch,'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'draft'})
 return rows

def crawl(category,query):
 records={};pages=[];history=[];stale=0;reason='visible-page-range-completed'
 path=ROOT/f'{category}-crawl.json'
 if path.exists():
  prev=json.loads(path.read_text());records={r['productId']:r for r in prev['products']};pages=prev['pages']
  # Failed last pages are retried, retaining their offers and failed-attempt metadata.
  history=prev.get('failedAttempts',[])
  while pages and pages[-1].get('error'): history.append(pages.pop())
 for page in range(len(pages)+1,51):
  before=len(records);batches=[];failed=None;seen_batches=set()
  for batch in range(1,7):
   try:rows=request(category,query,page,batch)
   except Exception as ex:failed=str(ex);break
   batches.append({'batch':batch,'received':len(rows),'ids':[r['productId'] for r in rows]})
   for r in rows:records.setdefault(r['productId'],r)
   ids=tuple(sorted(r['productId'] for r in rows))
   if ids in seen_batches:
    batches[-1]['stopReason']='repeated-batch';break
   seen_batches.add(ids)
   if len(rows)<20:break
   time.sleep(.2)
  pages.append({'page':page,'batches':batches,'newProducts':len(records)-before,'error':failed})
  if failed:reason=failed
  elif not batches or sum(b['received'] for b in batches)==0:reason='empty-results'
  stale=stale+1 if len(records)==before else 0
  # Check the entire visible page range even when earlier pages repeat.
  path.write_text(json.dumps({'category':category,'query':query,'products':list(records.values()),'pages':pages,'failedAttempts':history,'stopReason':reason,'complete':page==50 and not failed},ensure_ascii=False))
  print(category,'page',page,'unique',len(records),'new',len(records)-before,'status',failed or 'ok',flush=True)
  if failed or reason!='visible-page-range-completed':break
 return category,len(records),reason
if __name__ == '__main__':
 import sys
 selected={k:v for k,v in CATS.items() if not sys.argv[1:] or k in sys.argv[1:]}
 with concurrent.futures.ThreadPoolExecutor(max_workers=min(3,len(selected))) as ex:
  for result in ex.map(lambda kv:crawl(*kv),selected.items()):print('DONE',result,flush=True)

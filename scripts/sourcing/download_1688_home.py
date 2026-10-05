"""Download and decode genuine supplier images, retaining failures for review."""
import concurrent.futures, io, json, time, urllib.request, urllib.parse
from pathlib import Path
from PIL import Image
ROOT=Path('docs/sourcing/1688-home-2026-10-05')
OUT=Path('artifacts/fotizo/public/images/1688-home');OUT.mkdir(parents=True,exist_ok=True)
def download(row):
 ident=row['productId']; path=OUT/f'{ident}.webp'
 if path.exists():return ident, 'saved'
 url=row.get('image') or ''
 if url.startswith('//'):url='https:'+url
 host=urllib.parse.urlparse(url).hostname or ''
 if not (host=='alicdn.com' or host.endswith('.alicdn.com')):return ident,'unapproved image host'
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=25) as res: data=res.read(12_000_001)
  if len(data)>12_000_000:return ident,'image exceeds download limit'
  with Image.open(io.BytesIO(data)) as im:
   im.load(); im.thumbnail((1000,1000));im.convert('RGB').save(path.with_suffix('.tmp'),'WEBP',quality=83)
  path.with_suffix('.tmp').replace(path)
  return ident,'saved'
 except Exception as e:return ident,type(e).__name__
if __name__=='__main__':
 rows=json.loads((ROOT/'products.json').read_text());rows=[r for r in rows if r.get('englishTitle')]
 import sys
 if '--reverse' in sys.argv: rows.reverse()
 if '--late-appliances' in sys.argv: rows=[r for r in rows if 'home-appliances' in r['sourceCategories'] and r['sourcePage']>26]
 results={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4 if '--late-appliances' in sys.argv else 8) as pool:
  for i,(ident,status) in enumerate(pool.map(download,rows),1):
   results[ident]=status
   if i%100==0:print('Images checked',i,'saved',sum(x=='saved' for x in results.values()),flush=True)
 (ROOT/'image-results.json').write_text(json.dumps(results,indent=2)+'\n')
 print('Images',len(results),'saved',sum(x=='saved' for x in results.values()),flush=True)

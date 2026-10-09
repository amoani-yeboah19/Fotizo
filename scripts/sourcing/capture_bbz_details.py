from pathlib import Path
import json,re,html,urllib.request,concurrent.futures
p=Path('docs/sourcing/bbz-autos-2026-10-09/source-listings.json');rows=json.loads(p.read_text())
def capture(row):
 try:
  with urllib.request.urlopen(row['sourceUrl'],timeout=30) as r:s=r.read().decode('utf-8')
  table=re.search(r'<!-- Vehicle Specifications Table.*?<table\b[^>]*>(.*?)</table>',s,re.S)
  if table:
   cells=[html.unescape(re.sub('<[^>]+>','',x)).strip() for x in re.findall(r'<td\b[^>]*>(.*?)</td>',table[1],re.S)]
   row['sourceSpecifications']=dict(zip(cells[::2],cells[1::2]))
  gallery=re.search(r'id="gallery"[^>]*>(.*?)</ul>',s,re.S)
  row['galleryImageUrls']=list(dict.fromkeys(html.unescape(x) for x in re.findall(r'<img\b[^>]*src="([^"]+)"',gallery[1] if gallery else '',re.S)))
  row['detailCapture']='captured'
 except Exception as e:row['detailCapture']='failed';row['captureError']=str(e)
 return row
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(capture,rows))
p.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
print('Listings',len(rows),'details',sum(x['detailCapture']=='captured' for x in rows),'with galleries',sum(bool(x.get('galleryImageUrls')) for x in rows),'with specs',sum(bool(x.get('sourceSpecifications')) for x in rows))

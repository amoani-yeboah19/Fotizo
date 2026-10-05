"""Prepare private source records and conservative English names for seven new searches.
Source titles are untrusted data. Ambiguous listings remain held for review.
"""
import json,re,sys
from pathlib import Path
from urllib.parse import urlencode
from prepare_1688_home import RULES as HOME_RULES, ATTRS
ROOT=Path('/tmp/fotizo-1688-more-2026-10-05')
OUT=Path('docs/sourcing/1688-more-2026-10-05')
CATS={'packaging':'packaging','office-education':'office','logistics-packaging':'packaging','lighting':'lighting','lighting-market':'lighting','electronics-market':'electronics','furniture-lighting':'furniture'}
RULES=[
('ldo稳压ic|稳压ic|降压ic|驱动ic|闪存|nor闪存|数模转换|运算放大器|mosfet|mos管|晶体管|三极管|谐振器|光耦|气压计|放大器|电源管理','Electronic Component'),('麦克风','Microphone Component'),('面包板跳线|杜邦线|连接排线','Electronics Jumper Wires'),('电子夜光漂|夜光漂|电子漂尾|电子漂|海钓漂|钓鱼浮漂','Illuminated Fishing Float'),('手表|腕表','Watch'),('高精度电子秤|电子秤','Electronic Scale'),

('礼盒定制|伴手礼礼盒|折叠盒|翻盖盒','Gift Packaging Box'),('牛皮袋子|纸质袋','Paper Packaging Bag'),('外卖打包盒|手提盒','Takeaway Food Box'),('eva.*内托|内托','Protective Packaging Insert'),
('露营.*照明|野营.*照明|太阳能露营','Portable Camping Light'),('探照灯|强光工作灯','Portable Work Light'),('球泡|玉米灯','LED Light Bulb'),('面板灯|平板灯','LED Panel Light'),('钥匙扣灯|夹帽灯','Clip-On Light'),('盐水灯','Saltwater Emergency Light'),('车库灯','Garage Ceiling Light'),('头灯','Head Torch'),('手提称|手提秤|行李秤|快递秤','Portable Luggage Scale'),('电子称','Electronic Scale'),('igbt模块','IGBT Power Module'),('播报芯片|语音芯片|发声器芯片|语音播放ic','Voice Playback IC'),('存储器ic|存储器芯片','Memory IC'),('电源管理ic|电源管理芯片|充电管理ic','Power Management IC'),('芯片|电路芯片|半导体|集成.*ic|电子元器件','Electronic Component'),

('体脂秤|体重秤|人体秤','Body Weight Scale'),('厨房.*秤|食物.*秤|克秤','Kitchen Scale'),('珠宝秤|口袋秤','Jewellery Scale'),('计数秤|计重.*台秤|工业.*台秤','Commercial Counting Scale'),('电子台秤|台称|磅秤','Platform Weighing Scale'),('电子吊秤|行车秤','Hanging Scale'),('电子手表|电子表|电子腕表','Digital Watch'),('集成电路|ic芯片|电路芯片|元器件','Electronic Component'),('端子线|线束|电子导线','Electronic Wiring Harness'),('太阳能路灯|太阳能.*路灯','Solar Street Light'),('工矿灯','Industrial High Bay Light'),('直播补光灯','Video Fill Light'),('摆摊灯|夜市.*照明灯','Portable Market Light'),

('吸塑包装|吸塑泡壳|吸塑内托','Blister Packaging Tray'),('一次性碗|打包碗|汤杯','Disposable Food Bowl'),('伴手礼.*盒|礼盒装|翻盖盒|折叠礼盒|首饰盒|戒指盒|酒盒','Gift Packaging Box'),('塑料透明折盒|pvc盒子|折盒','Clear Folding Packaging Box'),('珠宝袋|饰品袋','Jewellery Pouch'),('手提篮','Gift Basket'),('塑木地板|木塑地板|石塑地板|spc石塑','Flooring Boards'),('金属花园边缘|花园围边|草坪围边|草石隔离带|花坛围栏','Garden Edging'),('eva内衬|包装内衬|eva板材|eva护角','Protective Packing Foam'),('快递打包机','Parcel Packing Machine'),('塑料周转箱|中空板箱','Plastic Storage Crate'),('箱钉|塑胶钉','Plastic Crate Fasteners'),('发泡袋','Protective Foam Bag'),('包装薄膜|pvc薄膜','Packaging Film'),('印刷标牌|铝牌','Metal Printed Sign'),
('活页本|活页外壳','Loose-Leaf Notebook'),('档案本|会员资料管理','Record Book'),('垫板夹|写字垫板|塑料垫板','Writing Clipboard'),('串珠笔专用|串珠笔穿珠','Pen Craft Components'),('毛球笔|串珠笔|造型笔|触屏笔|中油笔|塑料笔|手账笔','Novelty Pen'),('磁粒|磁铁|磁钉','Office Magnets'),('白板擦|黑板擦','Board Eraser'),
('led灯管|t5.*灯管|t8.*灯管|日光灯光源','LED Tube Light'),('投光灯|泛光灯','Outdoor Floodlight'),('青空灯|天晴空灯','Sky Effect Light'),('盐水袋灯','Camping Light'),('手摇发电.*灯','Hand-Crank Emergency Light'),('照明系统','Portable Lighting System'),('半月灯|美甲.*照明|美睫.*照明','Salon Task Lamp'),('应急照明灯','Emergency Light'),

('瓦楞.*飞机盒|飞机盒','Cardboard Mailer Box'),('搬家纸箱|收纳纸箱|快递纸箱|纸箱','Cardboard Shipping Box'),('礼品盒|彩盒|包装盒|纸盒|天地盖盒','Packaging Box'),('气柱袋|气泡柱','Air Column Protective Bag'),('气泡膜|气泡卷','Bubble Wrap'),('泡沫箱|保温箱','Insulated Shipping Box'),('泡棉|珍珠棉','Foam Packaging'),('蜂窝纸|缓冲纸','Honeycomb Packing Paper'),('牛皮纸|包装纸','Kraft Packing Paper'),('封箱胶带|打包胶带|透明胶带|胶带','Packing Tape'),('缠绕膜|拉伸膜','Stretch Wrap'),('热缩膜|收缩膜','Shrink Wrap'),('快递袋|物流袋|自封袋|拉链袋|包装袋|气泡袋','Packaging Bag'),('纸袋|礼品袋|手提袋','Paper Gift Bag'),('包装绳|捆扎绳|打包带|扎带','Packing Straps'),('填充纸|填充物','Packaging Filler'),('标签贴|不干胶标签|热敏标签|贴纸','Adhesive Labels'),('吸塑盒|塑料盒|透明盒','Clear Packaging Box'),('木箱|托盘','Shipping Crate or Pallet'),('餐盒|外卖盒|饭盒','Takeaway Food Box'),('蛋糕盒','Cake Box'),('花束包装|鲜花包装','Flower Wrapping'),('信封|文件袋','Document Envelope'),
('作业本|练习本|作文格|错题本','Exercise Book'),('草稿本','Draft Notebook'),('笔记本|记事本|日记本|线圈本','Notebook'),('圆珠笔|按动笔','Ballpoint Pen'),('中性笔|签字笔|水笔','Gel Pen'),('钢笔','Fountain Pen'),('铅笔|自动铅笔','Pencil'),('马克笔|记号笔|荧光笔','Marker Pen'),('彩笔|水彩笔','Colouring Pens'),('橡皮擦|橡皮','Eraser'),('削笔刀|卷笔刀','Pencil Sharpener'),('文具盒|笔袋','Pencil Case'),('文件夹|资料夹|档案夹','Document Folder'),('文件盒|档案盒','File Storage Box'),('订书机','Stapler'),('回形针|曲别针','Paper Clips'),('长尾夹|燕尾夹','Binder Clips'),('胶水|固体胶|胶棒','Office Glue'),('剪刀','Scissors'),('尺子|直尺','Ruler'),('计算器','Calculator'),('白板','Whiteboard'),('黑板','Blackboard'),('便签纸|便利贴','Sticky Notes'),('打印纸|复印纸|a4纸','Printer Paper'),('收据本|登记本','Record Book'),('画纸|素描纸','Drawing Paper'),('画笔|毛笔','Paintbrush'),('水彩颜料|丙烯颜料','Artist Paint'),('书包','School Bag'),('桌面收纳|笔筒','Desk Organiser'),
('led灯泡|灯泡|球泡灯','LED Light Bulb'),('灯带|灯条|灯串','LED Light Strip'),('台灯|阅读灯|学习灯','Desk Lamp'),('落地灯','Floor Lamp'),('吊灯|吊线灯|吊顶灯','Pendant Light'),('吸顶灯','Ceiling Light'),('筒灯|射灯|轨道灯','Recessed or Spot Light'),('壁灯','Wall Light'),('夜灯|小夜灯','Night Light'),('庭院灯|草坪灯|路灯','Outdoor Garden Light'),('太阳能灯','Solar Light'),('露营灯|帐篷灯','Camping Light'),('手电筒|手电','Torch'),('工作灯|工矿灯','Work Light'),('氛围灯|装饰灯|彩灯','Decorative Light'),('感应灯','Motion Sensor Light'),('应急灯','Emergency Light'),('灯罩','Lamp Shade'),('灯座|灯头','Lamp Socket'),('驱动电源|led驱动','LED Driver'),('开关','Electrical Switch'),
('手机壳','Phone Case'),('手机膜|钢化膜|保护膜','Screen Protector'),('充电宝|移动电源','Power Bank'),('数据线|充电线','Charging Cable'),('充电器|充电头','Charger'),('插座|插排|排插','Power Strip or Socket'),('电源适配器','Power Adapter'),('电路板|pcb板|线路板','Circuit Board'),('开发板','Development Board'),('传感器','Electronic Sensor'),('电容','Capacitor'),('电阻','Resistor'),('连接器|端子|接插件','Electrical Connector'),('继电器','Relay'),('电机|马达','Electric Motor'),('逆变器','Power Inverter'),('变压器','Transformer'),('稳压器','Voltage Regulator'),('电池','Battery'),('焊台|电烙铁','Soldering Tool'),('万用表','Multimeter'),('示波器','Oscilloscope'),('耳机','Headphones'),('音箱|蓝牙音响','Speaker'),('摄像头|监控','Security Camera'),('路由器','Wireless Router'),('鼠标','Computer Mouse'),('键盘','Computer Keyboard'),('平板电脑','Tablet Computer'),('笔记本电脑','Laptop Computer'),('显示器','Computer Monitor'),('u盘|闪存盘','USB Flash Drive'),('硬盘','Storage Drive'),
('沙发','Sofa'),('餐桌','Dining Table'),('茶几','Coffee Table'),('书桌|办公桌|电脑桌','Desk'),('椅子|餐椅|办公椅','Chair'),('床头柜','Bedside Cabinet'),('衣柜|收纳柜|鞋柜','Storage Cabinet'),('置物架|书架','Shelving Unit'),('床垫','Mattress'),('床架|木床|铁床','Bed Frame'),('镜子|穿衣镜','Mirror'),('挂钟','Wall Clock'),('灯具','Lighting Fixture')
]+HOME_RULES+[('客厅灯|卧室灯','Indoor Light'),('照明灯','Portable Light')]
# Avoid misleading listings such as empty boxes being sold as the electronics
# pictured on them; title and image review remains required before publication.
def category_for(key,title,kind):
 if key=='furniture-lighting':return 'lighting' if kind and any(w in kind for w in ('Light','Lamp','Bulb','Torch','Driver','Shade','Socket')) else 'furniture'
 if key=='logistics-packaging' and kind=='Flooring Boards':return 'improvement'
 if key=='electronics-market':
  if kind=='Digital Watch':return 'accessories'
  if kind and 'Scale' in kind:return 'general'
  if kind=='Illuminated Fishing Float':return 'general'
  if kind=='Watch':return 'accessories'
  if kind and any(w in kind for w in ('Phone','Headphones','Speaker','Camera','Router','Charger','Cable','Power Bank','Tablet','Laptop','Monitor')):return 'smart-devices'
  return 'electronics'
 return CATS[key]
def prepare():
 OUT.mkdir(parents=True,exist_ok=True);products={};coverage=[]
 for key in CATS:
  if not (ROOT/f'{key}-crawl.json').exists():
   if '--partial' in sys.argv:continue
   raise FileNotFoundError(ROOT/f'{key}-crawl.json')
  d=json.loads((ROOT/f'{key}-crawl.json').read_text())
  coverage.append({**{k:v for k,v in d.items() if k!='products'},'searchUrl':'https://www.1688.com/zw/page.html?'+urlencode({'hpageId':'old-sem-pc-list','keywords':d['query']})})
  for r in d['products']:
   ident=r['productId']
   if ident in products:
    if key not in products[ident]['sourceCategories']:products[ident]['sourceCategories'].append(key)
    continue
   title=r['originalTitle'].lower();kind=next((label for pattern,label in RULES if re.search(pattern,title)),None)
   if key=='office-education' and re.search('作业本|练习本',title):kind='Exercise Book'
   elif key=='office-education' and re.search('笔记本|记事本|活页本',title):kind='Notebook'
   if key in ('furniture-lighting','lighting','lighting-market') and '吊灯' in title and '吸顶' in title:kind='Ceiling Light'
   if not kind and key in ('furniture-lighting','lighting','lighting-market') and ('灯' in title or 'light' in title):kind='Lighting Fixture'
   attrs=[label for pattern,label in ATTRS if re.search(pattern,title)]
   source_sizes=list(dict.fromkeys(re.findall(r'(?<![\d.])(\d{1,2}(?:\.\d+)?)\s*(?:英寸|寸|inch)',title))) if kind in ('Tablet Computer','Laptop Computer','Computer Monitor') else []
   prefix=[source_sizes[0]+'-inch'] if len(source_sizes)==1 else []
   model_codes=[]
   if kind in ('Electronic Component','Microphone Component'):
    model_codes=[code for code in dict.fromkeys(re.findall(r'[A-Za-z]{1,8}\d[A-Za-z0-9-]{2,}',r['originalTitle'])) if not code.upper().startswith(('SOT','SOP','QFN','DFN','ESOP','TSSOP','TO-','LED'))]
    if len(model_codes)==1:prefix.insert(0,model_codes[0])
   english=' '.join(prefix+attrs[:2]+[kind]) if kind else None
   specs=[{'label':'Product type','value':kind}] if kind else []
   if attrs:specs.append({'label':'Listed features','value':', '.join(attrs)})
   if model_codes:specs.append({'label':'Listed part codes','value':', '.join(model_codes[:5])+'; confirm the selected component'})
   if source_sizes:specs.append({'label':'Listed screen sizes','value':', '.join(source_sizes)+' inches; confirm the selected model'})
   description=f'{english}. '+('Listed features: '+', '.join(a.lower() for a in attrs)+'. ' if attrs else '')+'Confirm the selected model, size and included items before ordering.' if english else None
   held='service-or-assortment' if key=='electronics-market' and bool(re.search('bom配单|一站式.*配单|电子元器件配单',title)) else None
   products[ident]={**r,'sourceCategories':[key],'proposedCategory':category_for(key,title,kind),'englishTitle':english,'englishDescription':description,'specifications':specs,'translationStatus':'source-derived-english-draft' if english else 'pending','publishable':False,'reviewHold':held}
 (OUT/'products.json').write_text(json.dumps(list(products.values()),ensure_ascii=False,indent=2)+'\n')
 (OUT/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
 (OUT/'unmatched-titles.json').write_text(json.dumps([{'id':r['productId'],'title':r['originalTitle']} for r in products.values() if not r['englishTitle']],ensure_ascii=False,indent=2)+'\n')
 print('Captured',len(products),'English drafts',sum(bool(r['englishTitle']) for r in products.values()))
if __name__=='__main__':prepare()

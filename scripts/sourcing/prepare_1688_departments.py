"""Prepare factual, source-derived drafts for Fotizo's smallest departments.

Uses the existing image/export pipeline; unknown products remain held privately.
Supplier text is data, never executable instructions. No stock or SKUs inferred.
"""
import argparse
import json
import re
from collections import Counter
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlencode
import prepare_1688_shoes as pipeline
from capture_1688_departments import CATEGORIES, ROOT
CATEGORY_MAP = {'smart-home': 'smart-devices'}

pipeline.OUT = Path('docs/sourcing/1688-departments-2026-10-07')
pipeline.DATA_STEM = '1688-departments'
pipeline.IMAGES = Path('artifacts/fotizo/public/images/1688-departments')
pipeline.RATE_PATH = Path('/private/tmp/fotizo-departments-rates.json')

RULES = {
    'furniture': [
        (r'全屋定制|清仓/微瑕疵|特价处理', None),
        (r'家具脚|桌脚|沙发脚|柜脚|床脚|家具配件|铰链|合页|滑轨|连接件|螺丝|五金配件|桌腿|椅脚', None),
        (r'沙发套|椅套|桌布|贴纸|贴膜|修补|补漆|家具漆|清洁|保护膜', None),
        (r'全套家具|家具套装|组合家具|家具组合', 'Furniture Set'),
        (r'桌椅|餐桌.*餐椅', 'Table and Chair Options'),
        (r'沙发床', 'Sofa Bed'), (r'沙发', 'Sofa'),
        (r'贵妃榻|贵妃椅|躺椅', 'Chaise or Reclining Chair'),
        (r'梳妆台|化妆桌|化妆台', 'Dressing Table'),
        (r'床头柜', 'Bedside Cabinet'), (r'电视柜', 'TV Cabinet'),
        (r'餐边柜', 'Sideboard'), (r'衣柜|衣橱', 'Wardrobe'),
        (r'书柜|书架', 'Bookcase'), (r'鞋柜', 'Shoe Cabinet'),
        (r'橱柜|储物柜|收纳柜|抽屉柜|文件柜|档案柜|展示柜|边柜|柜子', 'Storage Cabinet'),
        (r'床垫', 'Mattress'), (r'上下床|高低床|双层床', 'Bunk Bed'),
        (r'床架|木床|铁床|双人床|单人床|标间.*床|板式床|软包床|皮床|儿童床|公寓床', 'Bed Frame'),
        (r'餐桌|饭桌', 'Dining Table'), (r'茶几', 'Coffee Table'),
        (r'办公桌|电脑桌|书桌|写字台|学习桌', 'Desk'),
        (r'会议桌|培训桌', 'Meeting Table'), (r'边几|角几', 'Side Table'),
        (r'椅|座椅', 'Chair'), (r'凳', 'Stool'),
        (r'置物架|收纳架|货架|层架', 'Shelving Unit'),
        (r'衣帽架|衣架|挂衣架', 'Clothes Rack'),
        (r'屏风', 'Room Divider'), (r'桌子|折叠桌|边桌', 'Table'),
    ],
    'clocks': [
        (r'机芯|指针配件|钟针|配件|表壳|钟壳|钟面配件|挂钩|防尘罩|电池', None),
        (r'倒计时|计时器', 'Countdown Clock'),
        (r'电子钟|数码.*钟|数字.*钟|led.*钟|LED.*钟', 'Digital Clock'),
        (r'闹钟', 'Alarm Clock'), (r'挂钟|壁钟|墙钟|挂表', 'Wall Clock'),
        (r'座钟|台钟|桌面.*钟', 'Table Clock'), (r'时钟|钟表', 'Clock'),
    ],
    'industrial': [
        (r'工具包|空箱|空盒|工具空箱', 'Tool Storage Case'),
        (r'螺丝刀.*套装|套装.*螺丝刀|螺丝批.*套装', 'Screwdriver Set'),
        (r'工具套装|组合套装|工具箱套装|组套|工具组合|组合工具|工具箱带工具', 'Tool Set'),
        (r'内六角扳手|六角匙', 'Hex Key'),
        (r'套筒', 'Socket Tool'), (r'电扳手', 'Electric Wrench'),
        (r'扭力扳手', 'Torque Wrench'), (r'活动扳手|活口扳手|活扳手', 'Adjustable Wrench'),
        (r'扳手|扳子', 'Wrench'), (r'电钻|手电钻', 'Electric Drill'),
        (r'电动螺丝刀|电批', 'Electric Screwdriver'),
        (r'螺丝刀|螺丝批|起子|批头', 'Screwdriver or Bit'),
        (r'剥线钳', 'Wire Stripping Pliers'), (r'压线钳|压接钳', 'Crimping Pliers'),
        (r'尖嘴钳', 'Long-Nose Pliers'), (r'钢丝钳|老虎钳', 'Combination Pliers'),
        (r'钳', 'Pliers'), (r'工具箱', 'Tool Box'),
        (r'卷尺', 'Tape Measure'), (r'游标卡尺|数显卡尺|卡尺', 'Calliper'),
        (r'水平仪|水平尺', 'Levelling Tool'), (r'角磨机', 'Angle Grinder'),
        (r'打磨机|砂光机', 'Sanding Tool'), (r'砂轮|切割片|磨片', 'Grinding or Cutting Disc'),
        (r'电锯|手锯|锯子|锯条', 'Saw Tool'), (r'钻头|开孔器', 'Drill Bit'),
        (r'锤|榔头', 'Hammer'), (r'剪刀|剪子|铁皮剪', 'Workshop Shears'),
        (r'美工刀|裁纸刀|割刀', 'Utility Knife'),
        (r'锉刀', 'Metal File'), (r'铆钉枪', 'Rivet Tool'),
        (r'螺栓|螺钉|螺母|螺丝', 'Threaded Fastener'),
        (r'轴承', 'Bearing'), (r'弹簧', 'Spring'),
        (r'夹具|台钳|夹钳', 'Workshop Clamp'),
        (r'电烙铁|焊接工具', 'Soldering Tool'),
    ],
    'smart-devices': [
        (r'售货|售卖|贩卖|污水|游戏机|游艺|定制开发|方案开发|设计方案', None),
        (r'外壳|保护套|保护膜|贴膜|空盒|配件|线路板|电路板|模块|开发板|芯片', None),
        (r'智能手表|智能腕表', 'Smartwatch'), (r'智能手环', 'Activity Wristband'),
        (r'智能眼镜|蓝牙眼镜', 'Smart Glasses'),
        (r'智能门锁|指纹锁|电子锁|密码锁|APP门锁', 'Electronic Door Lock'),
        (r'可视门铃|智能门铃', 'Video Doorbell'),
        (r'摄像头|摄像机|监控器', 'Security Camera'),
        (r'智能音箱|智能音响', 'Smart Speaker'),
        (r'智能开关|触摸开关|无线开关|遥控开关|智能零火开关', 'Smart Switch'),
        (r'控制面板|灯控面板', 'Smart Control Panel'),
        (r'智能插座', 'Smart Socket'), (r'智能遥控', 'Smart Remote Control'),
        (r'智能网关|网关', 'Smart Gateway'),
        (r'温控器|恒温器', 'Smart Thermostat'),
        (r'通断器|智能断路器', 'Smart Power Controller'),
        (r'手指机器人', 'Remote Button Pusher'),
        (r'窗帘电机|窗帘机器人|电动窗帘', 'Smart Curtain Controller'),
        (r'开窗器|开窗机', 'Electric Window Opener'),
        (r'中控屏|中控面板', 'Smart Control Panel'),
        (r'温湿度|温度计', 'Temperature and Humidity Monitor'),
        (r'传感器|探测器', 'Electronic Sensor'),
        (r'追踪器|定位器|防丢器', 'Location Tracker'),
        (r'考勤机|打卡机', 'Attendance Terminal'),
        (r'人脸识别|门禁', 'Access Control Terminal'),
        (r'扫描枪|扫码枪', 'Barcode Scanner'),
        (r'手持终端|手持机|数据采集器|pda|PDA', 'Handheld Data Terminal'),
        (r'会议平板|触摸一体机|触控一体机|查询机', 'Interactive Display'),
        (r'电子相框|数码相框', 'Digital Photo Frame'),
        (r'智能投影|投影仪', 'Projector'),
    ],
}

ATTRS = [(r'实木', 'Solid Wood'), (r'不锈钢', 'Stainless Steel'),
         (r'藤编', 'Woven Rattan'), (r'布艺', 'Fabric'),
         (r'折叠', 'Foldable'), (r'可调节', 'Adjustable'),
         (r'石英', 'Quartz'), (r'静音', 'Quiet'),
         (r'充电', 'Rechargeable'), (r'便携', 'Portable'),
         (r'无线', 'Wireless')]

def english(title, category):
    kind = next((label for pattern, label in RULES[category] if re.search(pattern, title)), None)
    if not kind:
        return None, None, [], 'product-identification-or-relevance-review'
    if category == 'industrial' and 'Pliers' in kind:
        styles = [r'钢丝钳|老虎钳', r'尖嘴钳', r'斜口钳', r'剥线钳', r'压线钳|压接钳']
        if sum(bool(re.search(pattern, title)) for pattern in styles) > 1:
            kind = 'Workshop Pliers'
    attrs = [label for pattern, label in ATTRS if re.search(pattern, title)]
    name = ' '.join(attrs[:2] + [kind])
    specs = [{'label': 'Product type', 'value': kind}]
    if attrs:
        specs.append({'label': 'Listed features', 'value': ', '.join(attrs)})
    description = name + '.'
    if attrs:
        description += ' Supplier-listed features: ' + ', '.join(attrs).lower() + '.'
    description += ' Confirm dimensions, the selected model and included items before ordering.'
    return name, description, specs, None

def prepare():
    products, coverage = {}, []
    existing = pipeline.existing_ids()
    for search, query in CATEGORIES.items():
        category = CATEGORY_MAP.get(search, search)
        capture = json.loads((ROOT / (search + '-crawl.json')).read_text())
        coverage.append({**{k: v for k, v in capture.items() if k != 'products'},
            'searchUrl': 'https://www.1688.com/zw/page.html?' + urlencode({'hpageId': 'old-sem-pc-list', 'keywords': query})})
        for row in capture['products']:
            ident = row['productId']
            if ident in products:
                products[ident]['sourceCategories'].append(search)
                continue
            title, description, specs, hold = english(row['originalTitle'], category)
            if '1688-' + ident in existing:
                hold = 'already-in-existing-catalogue'
            try:
                cost = Decimal(str(row['supplierPrice']))
                if not cost.is_finite() or cost <= 0:
                    raise ValueError()
            except Exception:
                hold = hold or 'invalid-price'
            products[ident] = {**row, 'sourceCategories': [search],
                'proposedCategory': category, 'englishTitle': title,
                'englishDescription': description, 'specifications': specs,
                'translationStatus': 'source-derived-english-draft' if title else 'pending',
                'publishable': False, 'reviewHold': hold}
    pipeline.write(pipeline.OUT / 'products.json', list(products.values()))
    pipeline.write(pipeline.OUT / 'coverage.json', coverage)
    print('Captured:', len(products), 'eligible:', sum(not r['reviewHold'] for r in products.values()))
    print('Holds:', dict(Counter(r['reviewHold'] for r in products.values() if r['reviewHold'])))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('step', choices=['prepare', 'images', 'export'])
    args = parser.parse_args()
    {'prepare': prepare, 'images': pipeline.images, 'export': pipeline.export}[args.step]()

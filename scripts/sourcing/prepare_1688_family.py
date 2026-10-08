"""Source-derived English drafts for the owner's family and clothing expansion."""
import argparse
import re
from pathlib import Path
import prepare_1688_departments as batch
from capture_1688_family import CATEGORIES, ROOT
from prepare_1688_home import RULES as HOME_RULES

batch.CATEGORIES = CATEGORIES
batch.ROOT = ROOT
batch.CATEGORY_MAP = {'baby-care': 'baby', 'baby-clothing': 'baby', 'beauty-tools': 'beauty',
    'kitchen-appliances': 'appliances', 'mens-shirts': 'mens', 'womens-dresses': 'womens',
    'mens-jeans': 'mens', 'womens-tops': 'womens'}
batch.pipeline.OUT = Path('docs/sourcing/1688-family-2026-10-08')
batch.pipeline.DATA_STEM = '1688-family'
batch.pipeline.IMAGES = Path('artifacts/fotizo/public/images/1688-family')
batch.pipeline.RATE_PATH = Path('/private/tmp/fotizo-family-rates.json')

RULES = {
    'baby': [
        (r'四件套|床上用品|被套|床单', None),
        (r'奶粉盒|奶粉罐|储存罐', 'Baby Food Storage Container'),
        (r'学饮杯|吸管杯', 'Baby Drinking Cup'),
        (r'辅食碗|吸盘碗|喂养勺|训练筷|学习筷|零食碗|零食杯', 'Baby Feeding Utensils'),
        (r'奶粉|辅食泥|米粉|益生菌|药|抑菌|湿疹|止痒|乳膏|软膏', None),
        (r'尿布|纸尿裤|拉拉裤', 'Baby Nappies'),
        (r'洗头帽', 'Baby Bath Visor'),
        (r'奶瓶.*消毒|消毒.*奶瓶', 'Baby Bottle Steriliser'),
        (r'暖奶器|温奶器', 'Baby Bottle Warmer'),
        (r'连体衣|爬服|哈衣|包屁衣|连身衣|连体服|爬爬服', 'Baby Romper'),
        (r'衣服套装|服装套装|衣裤套装|内衣套装|两件套|三件套|婴儿套装', 'Baby Clothing Set'),
        (r'和尚服|蝴蝶衣', 'Baby Wrap Top'),
        (r'睡衣', 'Baby Pyjamas'), (r'连衣裙|公主裙', 'Baby Dress'),
        (r'外套|棉衣|羽绒服|夹克', 'Baby Jacket'),
        (r'毛衣|针织衫', 'Baby Jumper'), (r'卫衣', 'Baby Sweatshirt'),
        (r'T恤|t恤|上衣|打底衫', 'Baby Top'),
        (r'裤', 'Baby Trousers'), (r'袜', 'Baby Socks'),
        (r'帽', 'Baby Hat'),
        (r'牙胶|磨牙棒', 'Baby Teether'), (r'安抚奶嘴', 'Baby Pacifier'),
        (r'奶瓶刷', 'Baby Bottle Brush'), (r'奶瓶', 'Baby Feeding Bottle'),
        (r'奶嘴', 'Baby Bottle Teat'),
        (r'吸奶器', 'Breast Pump'), (r'储奶袋', 'Breast Milk Storage Bags'),
        (r'喂药器', None),
        (r'辅食碗|吸盘碗|餐盘|餐具|辅食勺|喂养勺|软勺', 'Baby Feeding Utensils'),
        (r'学饮杯|鸭嘴杯|吸管杯', 'Baby Drinking Cup'),
        (r'围兜|围嘴|口水巾|饭兜', 'Baby Bib'),
        (r'尿布|纸尿裤|拉拉裤', 'Baby Nappies'),
        (r'隔尿垫|换尿垫|护理垫', 'Baby Changing Mat'),
        (r'湿巾|湿纸巾', 'Baby Wipes'),
        (r'纱布巾|口水布|洗脸巾|方巾', 'Baby Washcloth'),
        (r'浴巾|浴袍', 'Baby Bath Towel'),
        (r'浴盆|澡盆|洗澡盆', 'Baby Bath Tub'),
        (r'洗头帽', 'Baby Bath Visor'),
        (r'睡袋|防踢被', 'Baby Sleep Sack'),
        (r'包被|抱被|襁褓|包巾', 'Baby Swaddle'),
        (r'毯|盖被', 'Baby Blanket'),
        (r'指甲剪|指甲钳|磨甲器', 'Baby Nail Care Tool'),
        (r'推车|婴儿车', 'Baby Pushchair'),
        (r'腰凳|背带|背巾', 'Baby Carrier'),
        (r'妈咪包|母婴包', 'Baby Changing Bag'),
        (r'玩具|摇铃|抓握球', 'Baby Toy'),
        (r'防撞条|防撞角', 'Furniture Corner Guard'),
        (r'儿童锁|安全锁', 'Child Safety Latch'),
    ],
    'beauty': [
        (r'注射|针剂|微针|纹绣|纹身|激光|光子|药|祛痣', None),
        (r'化妆套刷|全套刷具', 'Makeup Brush Set'),
        (r'眼线刷', 'Eyeliner Brush'),
        (r'眼线卡|眼线工具|眼妆辅助|眼影挡板', 'Eye Makeup Stencil'),
        (r'眉贴|画眉卡', 'Eyebrow Stencil'),
        (r'粉底铲|调色棒|刮调板', 'Makeup Mixing Spatula'),
        (r'美容剪刀|鼻毛剪刀', 'Grooming Scissors'),
        (r'美妆蛋|粉扑|海绵扑|气垫扑', 'Makeup Sponge'),
        (r'化妆刷.*套|套.*化妆刷|刷套装', 'Makeup Brush Set'),
        (r'粉底刷', 'Foundation Brush'), (r'腮红刷', 'Blush Brush'),
        (r'眼影刷', 'Eyeshadow Brush'), (r'散粉刷|蜜粉刷', 'Powder Brush'),
        (r'化妆刷|美妆刷|彩妆刷', 'Makeup Brush'),
        (r'睫毛夹', 'Eyelash Curler'), (r'假睫毛', 'False Eyelashes'),
        (r'睫毛刷|螺旋刷', 'Lash and Brow Brush'),
        (r'睫毛梳', 'Eyelash Comb'),
        (r'修眉刀|刮眉刀|眉刀', 'Eyebrow Razor'),
        (r'眉夹|眉钳|镊子', 'Beauty Tweezers'),
        (r'眉剪', 'Eyebrow Scissors'),
        (r'化妆镜|美妆镜|梳妆镜', 'Makeup Mirror'),
        (r'化妆包|洗漱包|收纳包', 'Makeup Bag'),
        (r'化妆箱|化妆盒|收纳盒|收纳桶|收纳架', 'Makeup Organiser'),
        (r'面膜碗|调膜碗', 'Face Mask Mixing Bowl'),
        (r'面膜刷|硅胶刷', 'Face Mask Applicator'),
        (r'分装瓶|喷雾瓶|按压瓶|分装罐', 'Refillable Cosmetic Container'),
        (r'卸妆棉|化妆棉|棉片', 'Cosmetic Pads'),
        (r'洗脸巾|洁面巾', 'Facial Cleansing Cloth'),
        (r'洗脸刷|洁面刷', 'Facial Cleansing Brush'),
        (r'发带|束发带|发箍', 'Makeup Headband'),
        (r'指甲剪|指甲钳', 'Nail Clipper'), (r'指甲锉|磨甲条', 'Nail File'),
        (r'美甲刷|指甲刷', 'Nail Brush'),
        (r'调色盘', 'Makeup Mixing Palette'),
        (r'唇刷', 'Lip Brush'),
    ],
    'mens': [
        (r'纸样|版型图|衣架|面料|布料|领撑|纽扣', None),
        (r'牛仔裤', 'Men’s Jeans'), (r'休闲裤|长裤', 'Men’s Trousers'),
        (r'衬衫|衬衣|shirt', 'Men’s Shirt'),
        (r'T恤|t恤', 'Men’s T-Shirt'), (r'夹克|外套', 'Men’s Jacket'),
    ],
    'womens': [
        (r'纸样|版型图|衣架|面料|布料|娃娃衣|宠物', None),
        (r'童装|女童|儿童|宝宝', None),
        (r'连衣裙|吊带裙|礼服|旗袍', 'Women’s Dress'),
        (r'半身裙|长裙|裙子|短裙|裙装', 'Women’s Skirt'),
        (r'衬衫|衬衣', 'Women’s Blouse'), (r'T恤|t恤', 'Women’s T-Shirt'),
        (r'开衫', 'Women’s Cardigan'), (r'毛衣|针织衫', 'Women’s Jumper'),
        (r'卫衣', 'Women’s Sweatshirt'), (r'背心|吊带', 'Women’s Vest Top'),
        (r'外套|夹克', 'Women’s Jacket'), (r'上衣|打底衫|小衫', 'Women’s Top'),
    ],
}

FEATURES = [(r'短袖', 'Short-Sleeve'), (r'长袖', 'Long-Sleeve'),
    (r'无袖', 'Sleeveless'), (r'V领|v领', 'V-Neck'), (r'圆领', 'Round-Neck'),
    (r'条纹', 'Striped'), (r'格子|格纹', 'Checked'), (r'碎花|印花', 'Printed'),
    (r'宽松', 'Relaxed-Fit'), (r'连帽', 'Hooded')]

def english(title, category):
    rules = RULES.get(category, HOME_RULES)
    if category == 'appliances' and re.search(r'配件|外壳|空壳|线路板|电路板|电源线|包装盒|纸盒|说明书', title):
        return None, None, [], 'appliance-accessory-review'
    kind = next((label for pattern, label in rules if re.search(pattern, title)), None)
    # Only appliance product nouns are accepted from the shared household rules.
    if category == 'appliances' and kind not in {
        'Rice Cooker', 'Air Fryer', 'Electric Kettle', 'Induction Hob', 'Electric Ceramic Hob',
        'Electric Cooking Pot', 'Blender', 'Coffee Maker', 'Soy Milk Maker', 'Food Chopper',
        'Electric Whisk', 'Bread Appliance', 'Electric Griddle', 'Electric Oven', 'Sandwich Maker',
        'Waffle Maker', 'Electric Steamer', 'Electric Tea Pot', 'Egg Cooker', 'Stand Mixer',
        'Portable Blender', 'Ice Maker', 'Food Warming Tray', 'Electric Hotplate', 'Water Dispenser',
    }:
        kind = None
    if not kind:
        return None, None, [], 'product-identification-or-relevance-review'
    if category == 'appliances' and re.search(r'绞肉机|搅蒜器|捣蒜器', title):
        kind = 'Food Chopper'
    if category == 'baby' and '套装' in title and kind in {
        'Baby Trousers', 'Baby Top', 'Baby Jacket', 'Baby Sweatshirt', 'Baby Jumper', 'Baby Pyjamas',
    }:
        kind = 'Baby Clothing Set'
    if category == 'beauty':
        if '眉' in title and '剪' in title and '刀' in title:
            kind = 'Eyebrow Grooming Tool'
        elif re.search(r'假睫毛.*辅助|佩戴睫毛|睫毛.*镊子', title) and re.search(r'镊|夹', title):
            kind = 'Eyelash Applicator'
        elif 'Brush' in kind and sum(bool(re.search(x, title)) for x in ['腮红刷', '粉底刷', '眼影刷', '散粉刷']) > 1:
            kind = 'Makeup Brush'
        elif kind == 'Makeup Mixing Spatula' and re.search(r'调色盘|调色板', title):
            kind = 'Makeup Mixing Tools'
    if category == 'baby' and re.search(r'儿童|女童|男童|中大童', title) and not re.search(r'婴|宝宝|新生', title):
        kind = kind.replace('Baby ', 'Children’s ')
    attrs = [label for pattern, label in FEATURES if re.search(pattern, title)] if category in ('mens', 'womens', 'baby') else []
    name = ' '.join(attrs[:3] + [kind])
    specs = [{'label': 'Product type', 'value': kind}]
    if attrs:
        specs.append({'label': 'Listed design', 'value': ', '.join(attrs)})
    description = name + '.'
    if attrs:
        description += ' Supplier-listed design details: ' + ', '.join(attrs).lower() + '.'
    description += ' Confirm the selected size or model, dimensions and included items before ordering.'
    return name, description, specs, None

batch.english = english

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('step', choices=['prepare', 'images', 'export'])
    args = parser.parse_args()
    {'prepare': batch.prepare, 'images': batch.pipeline.images, 'export': batch.pipeline.export}[args.step]()

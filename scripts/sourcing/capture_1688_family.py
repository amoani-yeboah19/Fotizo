"""Capture the requested family, beauty, appliance and clothing expansion."""
import concurrent.futures
import json
import time
from pathlib import Path
import capture_1688_more as capture

CATEGORIES = {"baby-care": "母婴用品", "baby-clothing": "婴儿服装", "beauty-tools": "化妆工具", "kitchen-appliances": "厨房小家电", "mens-shirts": "男士衬衫", "womens-dresses": "连衣裙", "mens-jeans": "男士牛仔裤", "womens-tops": "女士上衣"}
ROOT = Path('/tmp/fotizo-1688-family-2026-10-08')

if __name__ == '__main__':
    import sys
    original_request = capture.request

    def request_with_parse_retry(*args):
        for attempt in range(3):
            try:
                return original_request(*args)
            except json.JSONDecodeError:
                if attempt == 2:
                    raise
                time.sleep(2)

    capture.request = request_with_parse_retry
    capture.ROOT = ROOT
    ROOT.mkdir(exist_ok=True)
    selected = {k: v for k, v in CATEGORIES.items() if not sys.argv[1:] or k in sys.argv[1:]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(lambda item: capture.crawl(*item), selected.items()):
            print('DONE', result, flush=True)

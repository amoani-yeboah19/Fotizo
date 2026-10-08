"""Fill the smallest Fotizo departments using public 1688 search pagination."""
import concurrent.futures
import json
import time
from pathlib import Path
import capture_1688_more as capture

CATEGORIES = {"furniture": "家具", "clocks": "挂钟", "industrial": "五金工具", "smart-home": "智能家居"}
ROOT = Path('/tmp/fotizo-1688-departments-2026-10-07')

if __name__ == '__main__':
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
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(lambda item: capture.crawl(*item), CATEGORIES.items()):
            print('DONE', result, flush=True)

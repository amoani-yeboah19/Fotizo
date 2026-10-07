"""Capture the public page window for the three owner-supplied shoe searches."""
import concurrent.futures
import json
import time
from pathlib import Path
import capture_1688_more as capture

CATEGORIES = {"loafers": "豆豆鞋", "running-shoes": "跑步鞋", "sports-shoes": "运动鞋"}

if __name__ == "__main__":
    original_request = capture.request

    def request_with_parse_retry(*args):
        # A truncated JSON response is retried twice. Access restrictions stop
        # collection immediately and are never treated as a parsing retry.
        for attempt in range(3):
            try:
                return original_request(*args)
            except json.JSONDecodeError:
                if attempt == 2:
                    raise
                time.sleep(2)

    capture.request = request_with_parse_retry
    capture.ROOT = Path("/tmp/fotizo-1688-shoes-2026-10-07")
    capture.ROOT.mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(lambda item: capture.crawl(*item), CATEGORIES.items()):
            print("DONE", result, flush=True)

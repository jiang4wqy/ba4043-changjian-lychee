"""Revisit the official public reader comments for selected Zhihu Daily stories."""
import argparse
import json
from datetime import datetime
from pathlib import Path
import requests

from collect import TZ

STORIES = {"3963896": "2014-06-11", "9725075": "2020-06-21",
           "4812677": "2015-06-20", "9736501": "2021-05-31"}
API = "https://news-at.zhihu.com/api/4"


def get(url):
    response = requests.get(url, timeout=15)
    response.raise_for_status()
    return response.json()


def capture(story_id, stage, folder):
    y, m, d = STORIES[story_id].split("-")
    listing = f"https://raw.githubusercontent.com/JeetChan/history_json_daily_zhihu/master/data/{y}/{m}/{y}{m}{d}.json"
    story = next(s for s in get(listing)["stories"] if str(s["id"]) == story_id)
    source_url = f"{API}/story/{story_id}/short-comments"
    comments = get(source_url)["comments"]
    public_fields = [{"id": c["id"], "content": c["content"], "time": c["time"],
                      "reply_to_id": c.get("reply_to", {}).get("id", "")} for c in comments]
    records = [{"id": str(c["id"]), "text": c["content"], "order": rank,
                "parent_id": str(c["reply_to_id"]), "published_label":
                datetime.fromtimestamp(c["time"], TZ).isoformat(timespec="seconds")}
               for rank, c in enumerate(public_fields, 1)]
    capture = {"url": source_url, "title": story["title"], "channel": "知乎日报读者评论",
               "article_url": f"https://daily.zhihu.com/story/{story_id}", "archived_title_index": listing,
               "article_publication": STORIES[story_id],
               "collected_at": datetime.now(TZ).isoformat(timespec="seconds"),
               "public_comment_fields": public_fields, "records": records}
    (folder / f"{story_id}-{stage}.json").write_text(json.dumps(capture, ensure_ascii=False, indent=2), encoding="utf-8")
    print(story_id, stage, len(records), flush=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raw-dir", type=Path, required=True)
    p.add_argument("--stage", choices=["collect", "verify"], required=True)
    args = p.parse_args()
    args.raw_dir.mkdir(parents=True, exist_ok=True)
    for story_id in STORIES:
        capture(story_id, args.stage, args.raw_dir)

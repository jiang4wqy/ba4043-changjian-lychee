"""Collect and double-check the reviewed pilot on JD's public buyer-photo listing."""

import argparse
import csv
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote, urljoin, urlsplit

import requests
from bs4 import BeautifulSoup


HOME = Path(__file__).resolve().parent
ENTRY = "https://www.jd.com/hprm/1221846fd01171942c7be.html"
SOURCE = "https://www.jd.com/phb/key_12218469e4083a9593e75.html"
FIELDS = (
    "id", "text", "platform", "source_url", "collected_at", "context", "topics",
    "verified_at", "source_id", "listing_position", "detail_url", "comment_type",
)
# AI-assisted thematic coding of the records reviewed on 24 November. Text is read from JD.
CODING = {
    "100189702317_T6NbPsF2ipotdhqPUq6axn-D": "规格、包装、配送、品质",
    "100114715035_T6NbPsFziZktdhqGU6GQwXiJ": "规格、分量",
    "100162607992_T6NbOMB1j54tdRKDXa6dyHuJ": "包装、到货果况、家庭分享",
    "100171274405_T6NbOM9zjJgtdRKAWKOcxHmC": "送礼、包装、配送、到货果况",
    "100171984587_T6NbOM90gZgtdRKCUqWcwXaI": "保鲜、配送、品质、价格",
}


def now():
    return datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")


def read_page(url):
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    return BeautifulSoup(response.content.decode("utf-8"), "html.parser")


def capture():
    page = read_page(SOURCE)
    blocks = page.select(".content-item")
    if not blocks:
        raise RuntimeError("京东页面未返回可识别的晒单条目。")
    return {
        "url": SOURCE, "title": page.title.get_text(strip=True), "observed_at": now(),
        "blocks": [str(block) for block in blocks],
    }


def entries(snapshot):
    for position, markup in enumerate(snapshot["blocks"], 1):
        block = BeautifulSoup(markup, "html.parser")
        link = block.select_one('.evaluate-detail a[href*="/repay/"]')
        photo = block.select_one(".hot-evaluate .img-detail img[alt]")
        if not link or not photo:
            continue
        detail = urljoin(snapshot["url"], link["href"])
        source_id = Path(urlsplit(detail).path).stem.removesuffix("_1")
        yield {
            "source_id": source_id, "text": link.get_text(strip=True),
            "product": photo["alt"].removesuffix(" 晒单实拍图"),
            "detail_url": detail, "listing_position": position,
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True, help="New output directory")
    parser.add_argument("--replay", type=Path, help="Rebuild CSV from preserved raw.json")
    args = parser.parse_args()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if any((out / name).exists() for name in ("raw.json", "pilot.csv")):
        raise FileExistsError("请选择新输出位置，保留既有样本。")
    if args.replay:
        raw = json.loads(args.replay.read_text(encoding="utf-8"))
    else:
        entry = read_page(ENTRY)
        raw = {
            "entry": {"url": ENTRY, "observed_at": now(), "title": entry.title.get_text(strip=True),
                      "visible_review_links": len(entry.select('.evaluate-detail a[href*="/repay/"]'))},
            "first_visit": capture(), "verification_visit": capture(),
        }
    (out / "raw.json").write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    first, second = raw["first_visit"], raw["verification_visit"]
    verified = {row["source_id"]: row for row in entries(second)}
    rows = []
    seen = set()
    for record in entries(first):
        key = record["source_id"]
        if key not in CODING or key in seen:
            continue
        check = verified.get(key)
        if not check or any(check[f] != record[f] for f in ("text", "product", "detail_url")):
            continue
        seen.add(key)
        text = record["text"]
        rows.append({
            "id": f"JD-{len(rows) + 1:02d}", "platform": "京东", "text": text,
            "source_url": first["url"] + "#:~:text=" + quote(text[:24], safe=""),
            "collected_at": first["observed_at"], "verified_at": second["observed_at"],
            "context": "商品：" + record["product"] + "。京东买家晒单；其他商品，非长健农业评价。",
            "topics": CODING[key], "comment_type": "买家晒单（京东原生榜单展示）",
            "source_id": key, "listing_position": record["listing_position"],
            "detail_url": record["detail_url"],
        })
    with (out / "pilot.csv").open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Verified {len(rows)}/{len(CODING)} records; output: {out}.")


if __name__ == "__main__":
    main()

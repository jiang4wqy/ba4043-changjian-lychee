"""将三站已复核的数据合并为可用 Excel 打开的 UTF-8 CSV。"""

import argparse
import csv
from datetime import datetime
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
SITES = {"B站": "bilibili.com", "京东": "jd.com", "知乎": "zhihu.com"}
COLUMNS = {
    "platform": "平台",
    "id": "样本编号",
    "text": "评论原文",
    "source_url": "来源链接",
    "collected_at": "采集时间",
    "context": "上下文与评论对象",
    "topics": "主题",
    "verified_at": "复核时间",
}
EXTRA_COLUMNS = {"source_id": "平台原始编号", "detail_url": "独立详情链接（如有）"}


def read_samples(filename, minimum, maximum=None):
    rows = []
    seen_text = set()
    for site, domain in SITES.items():
        path = ROOT / site / filename
        with path.open(encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            missing = COLUMNS.keys() - set(reader.fieldnames or ())
            if missing:
                raise ValueError(f"{path} 缺少字段 {sorted(missing)}")
            records = list(reader)
        if len(records) < minimum or (maximum is not None and len(records) > maximum):
            raise ValueError(f"{path} 的记录数 {len(records)} 不符合本阶段要求")
        seen_ids = set()
        for row in records:
            if any(not (row.get(key) or "").strip() for key in COLUMNS):
                raise ValueError(f"{path} 有必要字段缺失")
            if row["platform"] != site:
                raise ValueError(f"{path} 中的平台字段与目录不符")
            collected, verified = (datetime.fromisoformat(row[key]) for key in ("collected_at", "verified_at"))
            if collected.tzinfo is None or verified.tzinfo is None or verified < collected:
                raise ValueError(f"{row['id']} 的采集或复核时间无效")
            url = urlsplit(row["source_url"])
            host = url.hostname or ""
            if url.scheme not in ("http", "https") or not (host == domain or host.endswith("." + domain)):
                raise ValueError(f"{site} 来源域名不符：{row['source_url']}")
            normalized = "".join(row["text"].split())
            if row["id"] in seen_ids or normalized in seen_text:
                raise ValueError(f"{path} 有重复编号或原文：{row['id']}")
            seen_ids.add(row["id"])
            seen_text.add(normalized)
            record = {key: row[key] for key in COLUMNS}
            record.update({key: row.get(key, "") for key in EXTRA_COLUMNS})
            rows.append(record)
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    stage = parser.add_mutually_exclusive_group()
    stage.add_argument("--full", action="store_true", help="合并每站至少 20 条的正式数据")
    stage.add_argument("--partial", action="store_true", help="有平台扩样不足 20 条时，合并各站目前已复核的样本")
    args = parser.parse_args()
    rows = read_samples("pilot.csv", 5, 5)
    name = "试采评论.csv"
    if args.full or args.partial:
        full = read_samples("full.csv", 20 if args.full else 5)
        def identities(records):
            return {(r["platform"], r["text"], r["source_url"].split("#")[0]) for r in records}
        if not identities(rows) <= identities(full):
            raise ValueError("正式样本缺少此前通过的试采记录。")
        rows = full
        name = "正式评论.csv" if args.full else "扩样评论_已核实.csv"
    target = ROOT / name
    temp = target.with_suffix(".tmp")
    with temp.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        columns = COLUMNS | EXTRA_COLUMNS
        writer.writerow(columns.values())
        writer.writerows([row[key] for key in columns] for row in rows)
    temp.replace(target)
    print("，".join(f"{site} {sum(r['platform'] == site for r in rows)} 条" for site in SITES))


if __name__ == "__main__":
    main()

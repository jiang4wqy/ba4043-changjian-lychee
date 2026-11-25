"""Capture public JD lists twice, then rebuild reviewed rows in source order."""
import argparse
import csv
import json
from pathlib import Path
from urllib.parse import quote

from collect_jd import HOME, FIELDS, entries, now, read_page


def capture(url):
    page = read_page(url)
    return {"url": url, "title": page.title.get_text(strip=True),
            "observed_at": now(), "blocks": [str(x) for x in page.select(".content-item")]}


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def build(raw_dir, output):
    with (HOME / "pilot.csv").open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    annotations = json.loads((HOME / "正式编码.json").read_text(encoding="utf-8"))
    seen_ids = {r["source_id"] for r in rows}
    seen_text = {" ".join(r["text"].split()) for r in rows}
    for snapshot_file in sorted(raw_dir.glob("*.json")):
        raw = json.loads(snapshot_file.read_text(encoding="utf-8"))
        first, second = raw["first_visit"], raw["verification_visit"]
        verification = {r["source_id"]: r for r in entries(second)}
        for record in entries(first):
            key, text = record["source_id"], record["text"]
            normalized = " ".join(text.split())
            if key not in annotations or key in seen_ids or normalized in seen_text:
                continue
            repeat = verification.get(key)
            if not repeat or any(repeat[k] != record[k] for k in ("text", "product", "detail_url")):
                continue
            labels = annotations[key]
            rows.append(dict(id=f"JD-{len(rows)+1:02d}", text=text, platform="京东",
                             source_url=first["url"]+"#:~:text="+quote(text[:24], safe=""),
                             collected_at=first["observed_at"], verified_at=second["observed_at"],
                             context="商品："+record["product"]+"。"+labels["context"],
                             topics=labels["topics"], source_id=key,
                             listing_position=record["listing_position"],
                             detail_url=record["detail_url"], comment_type="买家晒单（京东原生榜单展示）"))
            seen_ids.add(key)
            seen_text.add(normalized)
    if output.exists():
        raise FileExistsError(output)
    with output.open("w", encoding="utf-8-sig", newline="") as f:
        w=csv.DictWriter(f,FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"Verified {len(rows)} records, including the archived pilot.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    take = sub.add_parser("capture", help="Visit one public list twice and preserve its displayed records.")
    take.add_argument("key")
    take.add_argument("output", type=Path)
    replay = sub.add_parser("build", help="Apply manual annotations to captured records.")
    replay.add_argument("raw_dir", type=Path)
    replay.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.action == "capture":
        if args.output.exists():
            raise FileExistsError(args.output)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        url = "https://www.jd.com/phb/key_" + args.key + ".html"
        value = {"first_visit":capture(url), "verification_visit":capture(url)}
        save_json(args.output, value)
        print(args.output.name, len(list(entries(value["first_visit"]))))
    else:
        build(args.raw_dir,args.output)

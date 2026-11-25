"""核对逐条编码，生成主题计数和可直接放入英文 PPT 的图。"""

import csv
from collections import Counter
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import to_rgb
from matplotlib.patches import Rectangle


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "BA4043-评论采集" / "正式评论.csv"
PLATFORMS = ("B站", "京东", "知乎")
TOPICS = {
    "价格与预算": "Price and value",
    "规格与分量": "Size and quantity",
    "品种与食用特点": "Variety and eating qualities",
    "鲜度与果损": "Freshness and fruit damage",
    "配送与收货安排": "Delivery and receipt",
    "包装与图片": "Packaging and product images",
    "索取购买或联系入口": "Requests for a link or contact",
    "季节与供应": "Season and availability",
    "明确谈送礼": "Gift suitability or intent",
}


def read_rows(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def summarize():
    source = read_rows(SOURCE)
    coding = read_rows(ROOT / "逐条编码.csv")
    originals = {r["样本编号"]: r for r in source}
    ids = {r["样本编号"] for r in coding}
    platform_counts = Counter(r["平台"] for r in source)
    if platform_counts != Counter({site: 20 for site in PLATFORMS}):
        raise ValueError(f"本批样本的平台数量异常：{platform_counts}")
    if len(originals) != len(source) or len(coding) != len(ids) or ids != originals.keys():
        raise ValueError("编码表和原表的编号须逐条唯一对应")
    counts = {t: Counter() for t in TOPICS}
    for row in coding:
        sample_id = row["样本编号"]
        if set(row) != {"样本编号", *TOPICS} or not any(row[t] for t in TOPICS):
            raise ValueError(f"{sample_id} 的主题列有缺失或错位")
        source_row = originals[sample_id]
        for topic in TOPICS:
            excerpt = row[topic]
            if excerpt:
                if excerpt not in source_row["评论原文"]:
                    raise ValueError(f"{sample_id} 的“{topic}”摘句与原文不一致：{excerpt}")
                counts[topic][source_row["平台"]] += 1
    return sorted(counts.items(), key=lambda item: -item[1].total())


def draw_figure(results):
    paper, ink, accent = "#faf9f5", "#172b25", "#1e5948"
    fig = plt.figure(figsize=(14.4, 8.1), facecolor=paper)
    fig.text(.06, .90, "What people mention when choosing or receiving fruit",
             fontsize=28, color=ink, weight="bold")
    fig.text(.06, .842, "60 public comments  |  20 per platform  |  Counts by topic",
             fontsize=15, color="#445950")
    axis = fig.add_axes([.059, .14, .885, .65])
    axis.set_xlim(0, 9.2)
    axis.set_ylim(len(results) - .5, -1.3)
    axis.set_axis_off()
    centers = (4.95, 6.05, 7.15, 8.55)
    for x, title in zip(centers, ("Bilibili", "JD.com", "Zhihu", "All 60")):
        axis.text(x, -.88, title, ha="center", va="center", weight="bold", color=ink, fontsize=13)
    axis.text(.03, -.88, "Topic mentioned", va="center", color=ink, weight="bold", fontsize=13)
    light, dark = to_rgb("#f0f4ef"), to_rgb("#39795e")
    for index, (topic, counts) in enumerate(results):
        axis.plot([0, 9.1], [index - .52] * 2, color="#dce2da", lw=.7)
        axis.text(.03, index, TOPICS[topic], va="center", color=ink, fontsize=15)
        for x, platform in zip(centers, PLATFORMS):
            value = counts[platform]
            weight = value / 20
            rgb = tuple(a + (b - a) * weight for a, b in zip(light, dark))
            axis.add_patch(Rectangle((x - .50, index - .42), 1.0, .84, color=rgb, lw=0))
            axis.text(x, index, str(value), ha="center", va="center",
                      color="#0d241b" if value < 15 else "white", fontsize=15)
        axis.text(centers[-1], index, str(counts.total()), ha="center", va="center",
                  weight="bold", color=accent, fontsize=16)
    fig.text(.06, .067, "Each comment counts once per topic and may appear in several rows. "
             "The seven peer reviews are analysed separately.", fontsize=12, color="#45574f")
    fig.savefig(ROOT / "社区评论主题分布.png", dpi=160, facecolor=paper)
    plt.close(fig)


if __name__ == "__main__":
    results = summarize()
    with (ROOT / "各平台主题计数.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(("主题", *PLATFORMS, "合计"))
        for name, counts in results:
            writer.writerow((name, *(counts[p] for p in PLATFORMS), counts.total()))
    draw_figure(results)

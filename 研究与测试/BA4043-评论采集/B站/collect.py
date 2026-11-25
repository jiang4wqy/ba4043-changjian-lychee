"""Collect and independently revisit the displayed Bilibili comments with BrowserOS Neo."""
import argparse
import csv
import hashlib
import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
import subprocess
from queue import Empty, Queue
from threading import Thread

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
BRIDGE = Path(os.getenv("BROWSEROS_NEO_BRIDGE", "F:/AppData/BrowserOS-Neo/maintenance/bridge/bridge.mjs"))
TARGETS = {
    "BV1RX4y1A7i7": "品城记实访增城仙进奉；视频中销售方并非本组长健农业",
    "BV1FZ4y1v7Z4": "广东荔枝品种比较，含仙进奉、桂味和冰荔；非长健农业商品",
    "BV1nN3LzsEPz": "公益助农荔枝礼盒，含游戏收藏卡；非长健农业礼盒",
    "BV1Es4y1i79A": "网购荔枝开箱；非长健农业商品",
    "BV118T8zfEqE": "荔枝品种与保存讨论；非长健农业商品",
    "BV1pyMQzXEmz": "荔枝品种品评；非长健农业商品",
    "BV1cxKBzrEsr": "仙进奉品种讨论；非长健农业商品",
    "BV1gDTg6eEpK": "山姆仙进奉荔枝测评；非长健农业商品",
    "BV1WU3JzrErH": "消费者网购十种荔枝试吃；非长健农业商品",
    "BV1DcWozpEBF": "网购水果收货与选购经历；非长健农业商品",
    "BV1Rs4y1C7uu": "广东荔枝多品种盲测；非长健农业商品",
    "BV1kDtu6TEgn": "高价水果礼盒的礼赠与预算；苹果、石榴等其他水果",
    "BV1Ec411G74k": "网购妃子笑荔枝开箱与品种疑问",
    "BV1fwNQz6EXM": "果园发布仙进奉荔枝销售信息，非长健农业",
    "BV1R34y1H743": "增城其他果园的仙进奉产地展示",
    "BV1YDMezREkJ": "桂味、糯米糍与仙进奉品种试吃",
    "BV1dc411M7Uu": "增城时令荔枝与品种",
    "BV1thT3zjEDk": "高州妃子笑与白糖罂的品种介绍",
    "BV1DNAhzcEfP": "深圳超市高价水果礼盒选购，非长健农业",
    "BV1T4bnz4Ehe": "产地直发水果网购测评，非长健农业",
    "BV1wZ4y1b7Zh": "常见荔枝品种与口感比较",
    "BV1KkM66LEsQ": "新鲜荔枝保存经验",
    "BV1qs4EzAEj3": "新鲜水果物流讨论",
    "BV1eX4y117yP": "寻找荔枝品种与价格；非长健农业",
    "BV1nU411S7te": "荔枝减产与冰荔价格；非长健农业",
    "BV1KG4y1a7HX": "广州高价荔枝与价格讨论；非长健农业",
    "BV1wL8DzgE4n": "果园荔枝生产与消费讨论；非长健农业",
    "BV1B64y197L5": "果农清晨出售低价荔枝；非长健农业",
    "BV18J411C7ST": "广西灵山荔枝的价格；非长健农业",
    "BV1w5411H7AB": "巨型荔枝开果品尝；非长健农业",
    "BV11KhezNEfa": "果园摘鲜荔枝体验；非长健农业",
    "BV1EcQ1YhEfB": "拼多多网购水果的选购与收货经验；其他水果",
    "BV1mf6qYbETu": "水果新鲜度与挑选方法；其他水果",
    "BV1nG9JBsE51": "水果店礼盒款式；其他水果礼盒",
    "BV1JtVV6BEFY": "购买低价引流款水果后的快递开箱；其他水果",
    "BV1rF411n71i": "春节家庭分享车厘子；其他水果",
    "BV1yEDXBmEXB": "水果礼盒定价与内容物；其他水果",
    "BV1VkPxzsEpg": "汽车交付礼赠水果礼盒；其他水果",
    "BV1WVbM6qErh": "水果价格与消费选择；其他水果",
    "BV1mB6GBjE5j": "海运车厘子选购、鲜度；其他水果",
    "BV1JnrpBYECu": "长时间运输后车厘子的保鲜；其他水果",
    "BV1zT4y1p7zd": "三个销售渠道的红美人柑橘盲测；其他水果",
    "BV1TwreBLEmK": "车厘子的价格差异；其他水果",
    "BV13P2xBzEPC": "自购盒马车厘子开箱；其他水果",
    "BV1f7txeeEab": "山姆节日礼盒送礼方案，非长健农业",
    "BV1JqLn6YE9j": "多品种荔枝辨认，非长健农业",
}
FIELDS = ["id","text","platform","source_url","collected_at","context","topics","verified_at","source_id","posted_at","display_order","level"]
def now():
    return datetime.now(timezone(timedelta(hours=8))).isoformat(timespec="seconds")

class Browser:
    """Python standard-library MCP stdio client for the installed local Neo bridge."""
    def __init__(self):
        self.p = subprocess.Popen(["node",str(BRIDGE)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,encoding="utf-8")
        self.responses=Queue()
        def read_responses():
            for line in self.p.stdout:
                self.responses.put(line)
            self.responses.put(None)
        Thread(target=read_responses, daemon=True).start()
        self.serial = 0
        self.rpc("initialize",{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"codex","version":"bili-public-sampler-1"}})
        self.p.stdin.write(json.dumps({"jsonrpc":"2.0","method":"notifications/initialized"})+"\n")
        self.p.stdin.flush()
        self.call("name_session",{"name":"ba lychee research","category":"research","summary":"读取公开荔枝视频下的观众讨论"})
        self.call("tabs",{"action":"list"})
    def rpc(self,method,params):
        self.serial += 1
        self.p.stdin.write(json.dumps({"jsonrpc":"2.0","id":self.serial,"method":method,"params":params})+"\n")
        self.p.stdin.flush()
        while True:
            try: line=self.responses.get(timeout=90)
            except Empty:
                self.p.terminate()
                raise RuntimeError("Neo bridge did not return within 90 seconds")
            if line is None: break
            reply=json.loads(line)
            if reply.get("id")==self.serial:
                if "error" in reply: raise RuntimeError(str(reply["error"]))
                return reply["result"]
        raise RuntimeError("Neo bridge closed")
    def call(self,name,args):
        r=self.rpc("tools/call",{"name":name,"arguments":args})
        if r.get("isError"): raise RuntimeError(str(r.get("content",""))[:300])
        return r
    def run(self,code):
        r=self.call("run",{"code":code})["structuredContent"]
        if not r["ok"]: raise RuntimeError(str(r.get("error",""))[:300])
        return r["value"]
    def close(self):
        try: self.p.stdin.close()
        except OSError: pass
        try: self.p.wait(timeout=5)
        except subprocess.TimeoutExpired: self.p.terminate()

def collect(bvid,phase):
    RAW.mkdir(exist_ok=True)
    reader=(ROOT/"read_comments.js").read_text(encoding="utf-8")
    url=f"https://www.bilibili.com/video/{bvid}/"
    b=Browser()
    p=None
    try:
        p=b.run("const p=await browser.open('about:blank');return p.id")
        head=f"const p=browser.page({int(p)});"
        try: b.run(head+f"return await p.goto({json.dumps(url)})")
        except RuntimeError:
            if bvid not in b.run(head+"return (await p.info()).url"): raise
        try: b.run(head+"await p.scroll('down',840);return true")
        except RuntimeError as exc: print("Scroll status:",exc, flush=True)
        b.run(head+"return await p.waitForSelector('bili-comments',{timeout:6000})")
        b.run(head+"return await p.evaluateInPage(()=>document.querySelector('bili-comments')?.scrollIntoView({block:'center'}))")
        wait_js = """async () => {
            const until = Date.now() + 15000;
            while (Date.now() < until) {
                const feed = document.querySelector('bili-comments')?.shadowRoot;
                if (feed?.querySelector('bili-comment-thread-renderer')?.shadowRoot
                    ?.querySelector('bili-comment-renderer')?.shadowRoot?.querySelector('bili-rich-text')
                    ?.shadowRoot?.querySelector('p')?.textContent) return 'ready';
                await new Promise(done => setTimeout(done, 300));
            }
            return document.querySelector('bili-comments')?.shadowRoot?.querySelector('#end')?.textContent.trim() || 'no rendered feed';
        }"""
        status=b.run(head+"return (await p.evaluateInPage("+wait_js+")).value")
        result=b.run(head+"const r=await p.evaluateInPage("+reader+");const info=await p.info();return {rows:r.value,title:info.title,url:info.url}")
        if bvid not in result["url"]: raise RuntimeError("Page navigated away from requested video")
        rows=result["rows"]
        print("public feed",status, flush=True)
        item={"platform":"B站","url":url,"observed_url":result["url"],"bvid":bvid,"title":result.get("title"),"retrieved_at":now(),"order_mode":"页面默认显示，按主评、其已展开回复、下一主评顺序","rows":rows}
        out=RAW/f"{bvid}_{phase}.json"
        if out.exists():
            out=RAW/f"{bvid}_{phase}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.json"
        out.write_text(json.dumps(item,ensure_ascii=False,indent=2), encoding="utf-8")
        print(bvid,phase,len(rows), flush=True)
    finally:
        if p is not None:
            try: b.run(f"await browser.page({int(p)}).close();return true")
            finally: b.close()
        else: b.close()

def build(full=False):
    picks=json.loads((ROOT/"selection.json").read_text(encoding="utf-8"))
    if full: picks.extend(json.loads((ROOT/"selection_full.json").read_text(encoding="utf-8")))
    rows=[]
    for pick in picks:
        bvid=pick["bvid"]
        first_file=pick.get("first_file",f"{bvid}_first.json")
        first=json.loads((RAW/first_file).read_text(encoding="utf-8"))
        row=next(r for r in first["rows"] if r["order"]==pick["order"])
        match_fields = ("text", "level", "date", "source_id") if row["source_id"] else ("text", "level", "date")
        for archive in sorted(RAW.glob(f"{bvid}_recheck*.json")):
            second=json.loads(archive.read_text(encoding="utf-8"))
            if second["retrieved_at"] <= first["retrieved_at"]: continue
            if any(all(r[k]==row[k] for k in match_fields) for r in second["rows"]): break
        else: raise ValueError(f"Original page recheck failed: {bvid}, row {row['order']}")
        digest=row.get("archived_digest") or hashlib.sha256((bvid+"|"+row["date"]+"|"+row["text"]).encode()).hexdigest()[:12]
        url=first["url"]+(f"#reply{row['source_id']}" if row["source_id"] else "")
        group=[r for r in first["rows"] if r["thread"]==row["thread"] and r["level"]=="top"]
        context=TARGETS[bvid]+"。"+pick["context"]
        if row["level"]=="reply" and group: context+="。父评原文见同批原始记录第"+str(group[0]["order"])+"条"
        rows.append(dict(id="BILI-"+digest,text=row["text"],platform="B站",source_url=url,collected_at=first["retrieved_at"],context=context,topics=pick["topics"],verified_at=second["retrieved_at"],source_id=row["source_id"],posted_at=row["date"],display_order=row["order"],level=row["level"]))
    assert len({r["text"] for r in rows})==len(rows)
    with (ROOT/("full.csv" if full else "pilot.csv")).open("w",encoding="utf-8-sig",newline="") as f:
        w=csv.DictWriter(f,fieldnames=FIELDS);w.writeheader();w.writerows(rows)
    print("verified rows",len(rows))

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase",choices=["first","recheck","both","build","full"])
    parser.add_argument("bvid",nargs="*",help="target BV identifiers; default: all")
    args=parser.parse_args()
    for vid in args.bvid:
        if vid not in TARGETS: parser.error("Unknown BV identifier: "+vid)
    if args.phase in ("build", "full"):build(args.phase=="full")
    else:
        errors=[]
        for vid in args.bvid or list(TARGETS):
            try:
                phases=("first","recheck") if args.phase=="both" else (args.phase,)
                for phase in phases:
                    try: collect(vid,phase)
                    except RuntimeError as exc:
                        if "page_target_changed" not in str(exc): raise
                        collect(vid,phase)
            except RuntimeError as exc:
                errors.append(vid)
                print(vid, "failed", str(exc)[:250], flush=True)
        if errors: raise SystemExit("Uncollected targets: "+", ".join(errors))

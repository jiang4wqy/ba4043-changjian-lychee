"""Collect publicly displayed Zhihu comments in BrowserOS Neo; then match two independent visits."""
import argparse
import csv
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BRIDGE = Path(os.environ.get("BROWSEROS_BRIDGE", "F:/AppData/BrowserOS-Neo/maintenance/bridge/bridge.mjs"))
TZ = timezone(timedelta(hours=8))
FIELDS = ["id", "text", "platform", "source_url", "collected_at", "context", "topics",
          "verified_at", "source_id", "published_label", "display_order", "parent_id"]

# A fresh normal browser tab is opened on each visit. No credentials or private APIs are used.
OPEN_DRAWER = r"""
const p=browser.page(PAGE);
const snap=()=>p.snapshot({mode:'interactive'});
const matchRef=(s,pattern)=>s.text.match(pattern)?.[1];
let s=await snap();
const close=matchRef(s,/button "关闭" \[ref=(e\d+)\]/);
if(close){await p.click(close);s=await snap();}
let reply=matchRef(s,/button "[^"\n]*\d+\s*条评论" \[ref=(e\d+)\]/);
if(!reply) return {opened:false,reason:'原页未显示带条数的评论按钮'};
try { await p.click(reply); } catch(err) {
  s=await snap();
  const dismissal=matchRef(s,/button "关闭" \[ref=(e\d+)\]/);
  if(!dismissal) throw err;
  await p.click(dismissal);
  s=await snap();
  reply=matchRef(s,/button "[^"\n]*\d+\s*条评论" \[ref=(e\d+)\]/);
  await p.click(reply);
}
const ready=await p.waitForSelector('.CommentContent',{timeout:8000});
return {opened:ready.matched,reason:ready.matched?'':'评论抽屉未显示公开正文'};
"""
READ = r"""
const p=browser.page(PAGE);
const r=await p.evaluateInPage(()=>{
  const nodes=[...document.querySelectorAll('.CommentContent')].filter(e=>e.getClientRects().length);
  const records=nodes.map((el,i)=>{
    const row=el.closest('[data-id]');
    const parent=row?.parentElement.closest('[data-id]');
    return {order:i+1,id:row?.getAttribute('data-id')||'',text:el.innerText,
      parent_id:parent?.getAttribute('data-id')||'',
      published_label:el.nextElementSibling?.querySelector('span')?.innerText||''};
  });
  return {title:document.title,url:location.origin+location.pathname,records};
});
return r.value;
"""


def run_browser(proc, method, params, req_id):
    msg = {"jsonrpc": "2.0", "method": method, "params": params}
    if req_id is not None:
        msg["id"] = req_id
    proc.stdin.write(json.dumps(msg, ensure_ascii=False) + "\n")
    proc.stdin.flush()
    if req_id is None:
        return None
    for line in proc.stdout:
        data = json.loads(line)
        if data.get("id") == req_id:
            if "error" in data:
                raise RuntimeError(str(data["error"].get("message", "MCP request failed")))
            return data["result"]
    raise RuntimeError("BrowserOS bridge closed")


def collect(sources, outdir, stages=("collect", "verify"), force=False):
    with subprocess.Popen(["node", str(BRIDGE)], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                          encoding="utf-8", creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)) as proc:
        idx = 0
        def request(method, params):
            nonlocal idx
            idx += 1
            return run_browser(proc, method, params, idx)
        def run(code):
            result = request("tools/call", {"name":"run","arguments":{"code":code}})
            info = result.get("structuredContent", {})
            if not info.get("ok"):
                raise RuntimeError(info.get("error","BrowserOS could not complete the action"))
            return info["value"]
        try:
            request("initialize", {"protocolVersion":"2025-03-26","capabilities":{},
                                   "clientInfo":{"name":"codex","version":"1.0"}})
            run_browser(proc,"notifications/initialized",{},None)
            request("tools/call", {"name":"name_session","arguments":{"name":"zhihu fruit pilot","category":"research"}})
            run("await browser.pages.list();return true")
            for stage in stages:
                for url in sources:
                    slug = url.rstrip("/").split("/")[-1]
                    target = outdir/f"{slug}-{stage}.json"
                    if target.exists() and not force and json.loads(target.read_text(encoding="utf-8")).get("records"):
                        continue
                    page_id = None
                    evidence = {"url":url,"collected_at":datetime.now(TZ).isoformat(timespec="seconds")}
                    try:
                        page_id = run("const p=await browser.open('about:blank');return p.id")
                        try:
                            run(f"await browser.page({page_id}).goto("+json.dumps(url)+");return true")
                        except RuntimeError as err:
                            if "exceeded" not in str(err):
                                raise
                        run(f"return await browser.page({page_id}).waitForSelector('h1',{{timeout:3500}})")
                        info = run(OPEN_DRAWER.replace("PAGE",str(page_id)))
                        evidence.update(info)
                        if info["opened"]:
                            evidence.update(run(READ.replace("PAGE",str(page_id))))
                    except RuntimeError as err:
                        evidence.update(opened=False,reason=str(err).splitlines()[0][:180])
                    target.write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding="utf-8")
                    print(stage, slug, len(evidence.get("records", [])), evidence.get("reason",""),flush=True)
                    if page_id:
                        try:
                            run(f"await browser.page({page_id}).close();return true")
                        except RuntimeError:
                            pass  # The bridge may have reconnected after closing the tab.
        finally:
            proc.stdin.close()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.terminate()


def export(sources, outdir, target, limit, review):
    with review.open(encoding="utf-8-sig",newline="") as f:
        reviews={r["source_id"]:r for r in csv.DictReader(f)}
    kept=[]
    texts=set()
    for url in sources:
        parts = url.rstrip("/").split("/")
        slug = parts[-2] if parts[-1] == "short-comments" else parts[-1]
        first=json.loads((outdir/f"{slug}-collect.json").read_text(encoding="utf-8"))
        second=json.loads((outdir/f"{slug}-verify.json").read_text(encoding="utf-8"))
        other={r["id"]:r["text"] for r in second.get("records",[])}
        for row in first.get("records",[]):
            cid,body=row["id"],row["text"]
            rev=reviews.get(cid)
            if not rev or rev["source_url"] != url or body!=rev["text"] or body!=other.get(cid) or body in texts:
                continue
            texts.add(body)
            kept.append(dict(id="ZH-"+cid,text=body,platform="知乎",source_url=url,
                collected_at=first["collected_at"],context=rev["context"],topics=rev["topics"],
                verified_at=second["collected_at"],source_id=cid,published_label=row["published_label"],
                display_order=row["order"], parent_id=row["parent_id"]))
    with target.open("w",encoding="utf-8-sig",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(kept[:limit])
    print("Verified comments:",min(len(kept),limit),flush=True)


if __name__=="__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--sources", type=Path, default=ROOT/"sources.txt")
    p.add_argument("--raw-dir", type=Path, default=ROOT/"raw")
    p.add_argument("--csv",type=Path,default=ROOT/"pilot.csv")
    p.add_argument("--limit",type=int,default=5)
    p.add_argument("--replay",action="store_true")
    p.add_argument("--stage",choices=["collect","verify"])
    p.add_argument("--force",action="store_true",help="replace existing nonempty captures")
    p.add_argument("--review",type=Path,default=ROOT/"review.csv")
    args=p.parse_args()
    sources=[l.strip() for l in args.sources.read_text(encoding="utf-8-sig").splitlines() if l.strip()]
    args.raw_dir.mkdir(parents=True,exist_ok=True)
    if not args.replay:
        collect(sources,args.raw_dir,[args.stage] if args.stage else ("collect","verify"),args.force)
    if not args.stage:
        export(sources,args.raw_dir,args.csv,args.limit,args.review)

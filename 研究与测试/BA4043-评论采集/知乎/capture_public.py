"""Fallback for the public Zhihu comment drawer when the local Neo MCP bridge times out."""
import argparse
import asyncio
import json
import re
import sys
from datetime import datetime
from pathlib import Path

from playwright.async_api import async_playwright, Error
from collect import ROOT, TZ

DOM_ROWS = """elements => elements.filter(el => el.getClientRects().length).map((el,i) => {
  const row=el.closest('[data-id]');
  return {id:row?.dataset.id||'',order:i+1,text:el.innerText,
    parent_id:row?.parentElement.closest('[data-id]')?.dataset.id||'',
    published_label:el.nextElementSibling?.querySelector('span')?.innerText||''};
})"""


async def capture(browser, url, target):
    # Each pass uses independent, cookie-free Chromium storage.
    context=await browser.new_context(locale="zh-CN")
    p=await context.new_page()
    evidence=dict(url=url,collected_at=datetime.now(TZ).isoformat(timespec="seconds"),via="public-browser")
    try:
        await p.goto(url,wait_until="domcontentloaded",timeout=22000)
        await p.locator("h1").first.wait_for(timeout=6000)
        # Normal page buttons only. If the sign-in screen is mandatory, do not continue.
        button=p.get_by_role("button",name=re.compile(r"\d+\s*条评论")).first
        await button.wait_for(timeout=4500)
        for _ in range(3):
            close=p.get_by_role("button",name="关闭",exact=True).last
            if await close.is_visible():
                await close.click(timeout=2500)
            try:
                await button.click(timeout=3200)
                break
            except Error:
                if not await close.is_visible():
                    raise
        nodes=p.locator(".CommentContent")
        await nodes.first.wait_for(timeout=6500)
        records=await nodes.evaluate_all(DOM_ROWS)
        evidence.update(title=await p.title(), opened=True,reason="",records=records)
    except Error as exc:
        evidence.update(opened=False,reason=str(exc).splitlines()[0][:180])
    finally:
        await context.close()
    target.write_text(json.dumps(evidence,indent=2,ensure_ascii=False),encoding="utf-8")
    print(target.name,len(evidence.get("records",[])),evidence.get("reason",""),flush=True)


async def main():
    a=argparse.ArgumentParser()
    a.add_argument("--sources",type=Path,required=True)
    a.add_argument("--raw-dir",type=Path,default=ROOT/"raw-full")
    a.add_argument("--stage",choices=["collect","verify","both"],required=True)
    a.add_argument("--channel",default="msedge")
    args=a.parse_args()
    urls=args.sources.read_text(encoding="utf-8-sig").splitlines()
    args.raw_dir.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(channel=args.channel,headless=True)
        try:
            for stage in (["collect","verify"] if args.stage=="both" else [args.stage]):
                tasks=[]
                for url in urls:
                    if not url.strip():
                        continue
                    target=args.raw_dir/f"{url.rstrip('/').split('/')[-1]}-{stage}.json"
                    if target.exists() and json.loads(target.read_text(encoding="utf-8")).get("records"):
                        continue
                    tasks.append((url,target))
                for i in range(0,len(tasks),3):
                    await asyncio.gather(*(capture(browser,url,path) for url,path in tasks[i:i+3]))
        finally:
            await browser.close()


if __name__=="__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    asyncio.run(main())

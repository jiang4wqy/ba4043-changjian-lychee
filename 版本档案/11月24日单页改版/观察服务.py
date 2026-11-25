"""在本机预览改版网页，按北京时间汇总匿名页面事件。仅使用 Python 标准库。"""

import argparse
import csv
import json
import mimetypes
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parent
DEFAULT_DB = ROOT.parent / "运行记录" / "站点事件.sqlite3"
EVENTS = {"page_view", "box_compare", "delivery_lookup", "gallery_open", "enquiry_draft"}
STATIC_TYPES = {".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".webp", ".avif",
                ".svg", ".ico", ".woff", ".woff2", ".ttf"}
BEIJING = timezone(timedelta(hours=8))
SCHEMA = """CREATE TABLE IF NOT EXISTS counts (
    day TEXT NOT NULL, event TEXT NOT NULL, total INTEGER NOT NULL,
    PRIMARY KEY (day, event)
)"""


def prepare_database(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(path)) as db, db:
        db.execute(SCHEMA)


class Website(BaseHTTPRequestHandler):
    def log_message(self, *args):
        # 仅保存汇总数，不输出 IP、访问 URL 或表单内容。
        pass

    def reply(self, code, content=b"", media="text/plain; charset=utf-8", head=False):
        self.send_response(code)
        self.send_header("Content-Type", media)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if not head and content:
            self.wfile.write(content)

    def static(self, head=False):
        relative = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        candidate = (ROOT / relative).resolve()
        if not candidate.is_relative_to(ROOT) or candidate.suffix.lower() not in STATIC_TYPES or not candidate.is_file():
            return self.reply(404, head=head)
        content = candidate.read_bytes()
        media = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        if candidate.suffix.lower() == ".html":
            content = content.replace(b"</head>", b"<script>window.BA4043_METRICS=true;</script></head>", 1)
            media = "text/html; charset=utf-8"
        self.reply(200, content, media, head)

    def do_GET(self):
        self.static()

    def do_HEAD(self):
        self.static(head=True)

    def do_POST(self):
        if self.path != "/_metrics/event":
            return self.reply(404)
        if self.headers.get_content_type() != "application/json":
            return self.reply(415)
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 256:
                return self.reply(400)
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict) or set(payload) != {"event"}:
                return self.reply(400)
            event = payload["event"]
            if not isinstance(event, str) or event not in EVENTS:
                return self.reply(400)
        except (ValueError, UnicodeError):
            return self.reply(400)
        day = datetime.now(BEIJING).date().isoformat()
        try:
            with closing(sqlite3.connect(self.server.database, timeout=5)) as db, db:
                db.execute("""INSERT INTO counts(day, event, total) VALUES (?, ?, 1)
                              ON CONFLICT(day, event) DO UPDATE SET total = total + 1""", (day, event))
        except sqlite3.Error:
            return self.reply(503)
        self.reply(204)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8043)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--export", type=Path, metavar="CSV", help="导出汇总数后退出")
    args = parser.parse_args()
    if args.export:
        if not args.db.is_file():
            parser.error("这份数据库尚未开始记录")
        if args.export.resolve() == args.db.resolve():
            parser.error("导出文件需与数据库使用不同路径")
        args.export.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(args.db)) as db, args.export.open("w", encoding="utf-8-sig", newline="") as f:
            out = csv.writer(f)
            out.writerow(("日期（北京时间）", "事件", "次数"))
            out.writerows(db.execute("SELECT day, event, total FROM counts ORDER BY day, event"))
        return
    prepare_database(args.db)
    with ThreadingHTTPServer(("127.0.0.1", args.port), Website) as server:
        server.database = args.db
        print(f"本机预览地址 http://127.0.0.1:{server.server_port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()

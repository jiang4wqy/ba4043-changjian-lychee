"""Local coursework enquiry service. Run `python app.py --setup`, then `python app.py`."""
import argparse
import csv
from datetime import timedelta
from functools import wraps
import getpass
import hmac
import io
import os
from pathlib import Path
import re
import secrets
import sqlite3

from flask import Flask, Response, jsonify, redirect, render_template, request, send_from_directory, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash


ROOT = Path(__file__).resolve().parent
TOPICS = {"礼盒规格", "当季供应", "配送与购买渠道", "其他咨询"}
EVENTS = {"page_view", "gift_view", "delivery_open", "date_change", "gallery_open", "enquiry_view"}


def data_directory():
    return Path(os.environ.get("CHANGJIAN_DATA_DIR", ROOT / "instance")).resolve()


def create_app(test_config=None):
    app = Flask(__name__, static_folder=None)
    folder = data_directory()
    app.config.from_mapping(
        DATABASE=str(folder / "enquiries.sqlite3"),
        MAX_CONTENT_LENGTH=16 * 1024,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.environ.get("CHANGJIAN_SECURE_COOKIE") == "1",
        PERMANENT_SESSION_LIFETIME=timedelta(hours=2),
    )
    if test_config:
        app.config.update(test_config)
    else:
        folder.mkdir(parents=True, exist_ok=True)
        password_file = folder / "admin-password.hash"
        if not password_file.exists():
            raise RuntimeError("Please run: python app.py --setup")
        app.config["ADMIN_PASSWORD_HASH"] = password_file.read_text(encoding="utf-8").strip()
        secret_file = folder / "secret.key"
        if not secret_file.exists():
            secret_file.write_text(secrets.token_hex(32), encoding="utf-8")
        app.config["SECRET_KEY"] = os.environ.get("CHANGJIAN_SECRET_KEY") or secret_file.read_text(encoding="utf-8").strip()
    Path(app.config["DATABASE"]).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(app.config["DATABASE"]) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS enquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            customer_name TEXT NOT NULL,
            topic TEXT NOT NULL,
            contact_method TEXT NOT NULL,
            contact TEXT NOT NULL,
            message TEXT NOT NULL,
            consent INTEGER NOT NULL CHECK (consent = 1)
        )""")
        db.execute("""CREATE TABLE IF NOT EXISTS daily_events (
            day TEXT NOT NULL, event TEXT NOT NULL, total INTEGER NOT NULL,
            PRIMARY KEY (day, event)
        )""")

    def csrf_token():
        if "csrf" not in session:
            session["csrf"] = secrets.token_urlsafe(32)
        return session["csrf"]

    def csrf_valid(token):
        return isinstance(token, str) and bool(session.get("csrf")) and hmac.compare_digest(token.encode(), session["csrf"].encode())

    def admin_required(view):
        @wraps(view)
        def protected(*args, **kwargs):
            if not session.get("admin"):
                return redirect(url_for("login"))
            return view(*args, **kwargs)
        return protected

    @app.after_request
    def headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "same-origin"
        if request.path.startswith(("/api/", "/admin")):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/")
    @app.get("/index.html")
    def index():
        return send_from_directory(ROOT, "index.html")

    @app.get("/assets/web/<path:filename>")
    def assets(filename):
        return send_from_directory(ROOT / "assets" / "web", filename)

    @app.get("/<filename>")
    def frontend_file(filename):
        if filename not in {"styles.css", "script.js", "chapters.js"}:
            return "Not found", 404
        return send_from_directory(ROOT, filename)

    @app.get("/favicon.ico")
    def favicon():
        return "", 204

    @app.get("/api/health")
    def health():
        try:
            with sqlite3.connect(app.config["DATABASE"]) as db:
                db.execute("SELECT id FROM enquiries LIMIT 1").fetchone()
        except sqlite3.Error:
            return jsonify(status="unavailable"), 503
        return jsonify(status="ok", storage="sqlite")

    @app.get("/api/session")
    def enquiry_session():
        return jsonify(mode="stored", csrf_token=csrf_token())

    @app.post("/api/events")
    def log_event():
        payload = request.get_json(silent=True)
        if request.headers.get("Sec-Fetch-Site") == "cross-site":
            return "", 403
        if not isinstance(payload, dict) or set(payload) != {"event"}:
            return "", 400
        event = payload["event"]
        if not isinstance(event, str) or event not in EVENTS:
            return "", 400
        with sqlite3.connect(app.config["DATABASE"], timeout=5) as db:
            db.execute("""INSERT INTO daily_events VALUES (date('now', '+8 hours'), ?, 1)
                          ON CONFLICT(day, event) DO UPDATE SET total = total + 1""", (event,))
        return "", 204

    @app.get("/admin/traffic.csv")
    @admin_required
    def traffic_csv():
        report = io.StringIO()
        writer = csv.writer(report)
        writer.writerow(("date_beijing", "event", "count"))
        with sqlite3.connect(app.config["DATABASE"]) as db:
            writer.writerows(db.execute("SELECT day, event, total FROM daily_events ORDER BY day, event"))
        return Response(report.getvalue(), mimetype="text/csv", headers={
            "Content-Disposition": 'attachment; filename="changjian-traffic.csv"'
        })

    @app.post("/api/enquiries")
    def save_enquiry():
        if not csrf_valid(request.headers.get("X-CSRF-Token")):
            return jsonify(message="咨询会话已失效，请重新连接后再提交。"), 403
        if not request.is_json:
            return jsonify(message="请使用页面上的咨询表单。"), 415
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return jsonify(message="咨询信息格式有误。"), 400
        errors = {}
        values = {}
        for name in ("customer_name", "topic", "contact_method", "contact", "message"):
            value = payload.get(name, "")
            values[name] = value.strip() if isinstance(value, str) else ""
            if name in payload and not isinstance(value, str):
                errors[name] = "请填写文字信息。"
        if not 1 <= len(values["customer_name"]) <= 50:
            errors["customer_name"] = "请填写 1—50 字的称呼。"
        if values["topic"] not in TOPICS:
            errors["topic"] = "请选择有效的咨询主题。"
        method, contact = values["contact_method"], values["contact"]
        if method not in {"phone", "email"}:
            errors["contact_method"] = "请选择手机或邮箱。"
        elif method == "phone" and not re.fullmatch(r"1[3-9][0-9]{9}", contact):
            errors["contact"] = "请输入有效的 11 位中国大陆手机号码。"
        elif method == "email" and not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*", contact):
            errors["contact"] = "请输入有效的邮箱地址。"
        if len(contact) > 100:
            errors["contact"] = "联系方式不能超过 100 字。"
        if len(values["message"]) > 300:
            errors["message"] = "咨询内容不能超过 300 字。"
        if payload.get("consent") is not True:
            errors["consent"] = "请确认同意保存联系方式和留言。"
        if errors:
            return jsonify(message="请检查标出的信息。", errors=errors), 422
        try:
            with sqlite3.connect(app.config["DATABASE"], timeout=5) as db:
                cursor = db.execute(
                    "INSERT INTO enquiries (customer_name, topic, contact_method, contact, message, consent) VALUES (?, ?, ?, ?, ?, 1)",
                    tuple(values[name] for name in ("customer_name", "topic", "contact_method", "contact", "message")),
                )
                record_id = cursor.lastrowid
        except sqlite3.Error:
            app.logger.error("Enquiry database write failed; no success response issued.")
            return jsonify(message="咨询暂未保存，请稍后再试。"), 503
        return jsonify(reference=f"CJ-{record_id:06d}", message="咨询已保存。"), 201

    @app.errorhandler(413)
    def too_large(error):
        return jsonify(message="填写的信息过长，请缩短后再试。"), 413

    @app.route("/admin/login", methods=["GET", "POST"])
    def login():
        error, status = "", 200
        if request.method == "POST":
            if not csrf_valid(request.form.get("csrf_token")):
                error, status = "登录会话已失效，请重新填写。", 403
            elif not check_password_hash(app.config["ADMIN_PASSWORD_HASH"], request.form.get("password", "")):
                error, status = "密码不正确，请重试。", 401
            else:
                session.clear()
                session["admin"] = True
                session.permanent = True
                return redirect(url_for("admin"))
        return render_template("admin.html", login=True, error=error, csrf_token=csrf_token()), status

    @app.get("/admin")
    @admin_required
    def admin():
        page = max(1, request.args.get("page", 1, type=int))
        with sqlite3.connect(app.config["DATABASE"]) as db:
            db.row_factory = sqlite3.Row
            total = db.execute("SELECT COUNT(*) FROM enquiries").fetchone()[0]
            pages = max(1, (total + 49) // 50)
            page = min(page, pages)
            records = db.execute("SELECT *, datetime(created_at, '+8 hours') AS local_time FROM enquiries ORDER BY id DESC LIMIT 50 OFFSET ?", ((page - 1) * 50,)).fetchall()
        return render_template("admin.html", login=False, records=records, total=total, page=page, pages=pages, csrf_token=csrf_token())

    @app.post("/admin/logout")
    @admin_required
    def logout():
        if not csrf_valid(request.form.get("csrf_token")):
            return "登录会话已失效，请刷新后重试。", 403
        session.clear()
        return redirect(url_for("login"))

    return app


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--setup", action="store_true", help="Set the administrator password; preserves enquiry records")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()
    if args.setup:
        password = os.environ.get("CHANGJIAN_SETUP_PASSWORD") or getpass.getpass("New admin password (at least 12 characters): ")
        if not 12 <= len(password) <= 200:
            parser.error("Administrator password must contain 12 to 200 characters.")
        if not os.environ.get("CHANGJIAN_SETUP_PASSWORD") and password != getpass.getpass("Repeat password: "):
            parser.error("Passwords do not match.")
        folder = data_directory()
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "admin-password.hash").write_text(generate_password_hash(password), encoding="utf-8")
        print("Administrator password configured. Existing enquiry records are preserved.")
    else:
        from waitress import serve
        print(f"Website: http://{args.host}:{args.port}/\nAdministrator: /admin", flush=True)
        serve(create_app(), host=args.host, port=args.port, max_request_body_size=16 * 1024)

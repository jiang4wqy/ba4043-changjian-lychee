import re
import sqlite3

import pytest
from werkzeug.security import generate_password_hash

from app import create_app


@pytest.fixture
def app(tmp_path):
    return create_app({"TESTING": True, "DATABASE": str(tmp_path / "test.sqlite3"),
                       "SECRET_KEY": "isolated-test-secret", "ADMIN_PASSWORD_HASH": generate_password_hash("test-password-123")})


@pytest.fixture
def client(app):
    return app.test_client()


def payload(**changes):
    data = {"customer_name": "Example student", "topic": "礼盒规格", "contact_method": "email",
            "contact": "student@example.com", "message": "Please confirm the size and delivery date.", "consent": True}
    data.update(changes)
    return data


def send(client, data):
    token = client.get("/api/session").json["csrf_token"]
    return client.post("/api/enquiries", json=data, headers={"X-CSRF-Token": token})


def count(app):
    with sqlite3.connect(app.config["DATABASE"]) as db:
        return db.execute("SELECT COUNT(*) FROM enquiries").fetchone()[0]


def login(client, password="test-password-123"):
    html = client.get("/admin/login").get_data(as_text=True)
    token = re.search(r'name="csrf_token" value="([^"]+)"', html).group(1)
    return client.post("/admin/login", data={"csrf_token": token, "password": password})


def test_save_commit_and_persistence_after_app_recreation(app, client):
    response = send(client, payload())
    assert response.status_code == 201
    assert response.json["reference"] == "CJ-000001"
    assert "student@example.com" not in response.get_data(as_text=True)
    replacement = create_app(dict(app.config))
    assert count(replacement) == 1
    assert login(replacement.test_client()).status_code == 302


@pytest.mark.parametrize("changes", [
    {"customer_name": " "}, {"customer_name": "a" * 51}, {"topic": "invented topic"},
    {"contact_method": "fax"}, {"contact": "invalid-address"}, {"contact": "a" * 90 + "@example.com"},
    {"contact_method": "phone", "contact": "12345"}, {"contact_method": "phone", "contact": "138٠٠١٣٨٠٠٠"},
    {"message": "a" * 301}, {"message": ["invalid"]}, {"consent": False}, {"consent": "true"},
])
def test_invalid_direct_requests_do_not_save(app, client, changes):
    response = send(client, payload(**changes))
    assert response.status_code == 422
    assert response.json["errors"]
    assert count(app) == 0


def test_phone_contact_saves(client):
    assert send(client, payload(contact_method="phone", contact="13800138000")).status_code == 201


def test_missing_or_invalid_csrf_and_wrong_content_type(app, client):
    assert client.post("/api/enquiries", json=payload()).status_code == 403
    client.get("/api/session")
    assert client.post("/api/enquiries", json=payload(), headers={"X-CSRF-Token": "非有效令牌"}).status_code == 403
    token = client.get("/api/session").json["csrf_token"]
    assert client.post("/api/enquiries", data="not JSON", headers={"X-CSRF-Token": token}).status_code == 415
    assert send(client, ["not a record"]).status_code == 400
    assert count(app) == 0


def test_failed_write_never_claims_success(app, client, tmp_path):
    original = app.config["DATABASE"]
    app.config["DATABASE"] = str(tmp_path)  # A directory cannot be opened as the SQLite file.
    assert client.get("/api/health").status_code == 503
    response = send(client, payload())
    assert response.status_code == 503
    assert "reference" not in response.json
    app.config["DATABASE"] = original
    assert count(app) == 0


def test_admin_auth_logout_and_escaped_values(app, client):
    attack = "<script>alert(1)</script>"
    assert send(client, payload(customer_name="O'Connor", message=attack)).status_code == 201
    assert client.get("/admin").status_code == 302
    assert login(client, "wrong-password").status_code == 401
    assert client.get("/admin").status_code == 302
    assert login(client).status_code == 302
    response = client.get("/admin")
    html = response.get_data(as_text=True)
    assert "student@example.com" in html
    assert attack not in html
    assert "&lt;script&gt;" in html
    assert response.headers["Cache-Control"] == "no-store"
    assert client.post("/admin/logout", data={}).status_code == 403
    token = re.search(r'name="csrf_token" value="([^"]+)"', html).group(1)
    assert client.post("/admin/logout", data={"csrf_token": token}).status_code == 302
    assert client.get("/admin").status_code == 302
    assert count(app) == 1


def test_admin_pagination_does_not_hide_older_records(app, client):
    with sqlite3.connect(app.config["DATABASE"]) as db:
        db.executemany("INSERT INTO enquiries (customer_name, topic, contact_method, contact, message, consent) VALUES (?, ?, ?, ?, ?, 1)",
                       [(f"Student {i}", "礼盒规格", "email", "example@example.com", "") for i in range(55)])
    login(client)
    first = client.get("/admin").get_data(as_text=True)
    last = client.get("/admin?page=2").get_data(as_text=True)
    assert first.count('class="admin-record"') == 50
    assert last.count('class="admin-record"') == 5
    assert "Student 0" in last


def test_static_routes_never_expose_secrets_or_database(client):
    for path in ("/app.py", "/.env", "/instance/enquiries.sqlite3", "/instance/secret.key", "/assets/web/../../app.py"):
        assert client.get(path).status_code == 404
    for path in ("/", "/index.html", "/styles.css", "/script.js", "/chapters.js", "/assets/web/gift-box.jpg"):
        assert client.get(path).status_code == 200
    assert client.get("/api/health").json == {"status": "ok", "storage": "sqlite"}


def test_oversized_request_rejected_before_storage(app, client):
    response = send(client, payload(message="x" * 20000))
    assert response.status_code == 413
    assert count(app) == 0

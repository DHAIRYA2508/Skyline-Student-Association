import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["SEED_DEMO_DATA"] = "true"
os.environ["BCRYPT_ROUNDS"] = "4"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.session import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.db.init_db import init_db  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    engine.dispose()
    path = f"{_tmp}/test.db"
    if os.path.exists(path):
        os.remove(path)
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def _login(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture()
def auth(client):
    cache = {}

    def get(email, password="demo1234"):
        if email not in cache:
            cache[email] = {"Authorization": f"Bearer {_login(client, email, password)['access_token']}"}
        return cache[email]
    return get


@pytest.fixture()
def H(auth):
    class Heads:
        root = auth("contact@skyline-sa.org", "admin123")
        head = auth("admin@skyline-sa.org", "admin123")
        treas = auth("treasurer@skyline-sa.org")
        events = auth("events@skyline-sa.org")
        inv = auth("inventory@skyline-sa.org")
        coord = auth("coordinator@skyline-sa.org")
        vol = auth("volunteer@skyline.edu")
        john = auth("john.doe@skyline.edu", "password123")
        new = auth("new.student@skyline.edu")
        omar = auth("omar.hassan@skyline.edu")
    return Heads

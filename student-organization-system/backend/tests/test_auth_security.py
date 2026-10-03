from app.db.session import SessionLocal
from app.models.organization import RefreshToken, User


def test_valid_and_invalid_login(client):
    ok = client.post("/api/v1/auth/login", json={"email": "john.doe@skyline.edu", "password": "password123"})
    assert ok.status_code == 200 and ok.json()["user"]["roles"] == ["MEMBER"]
    bad = client.post("/api/v1/auth/login", json={"email": "john.doe@skyline.edu", "password": "nope"})
    assert bad.status_code == 401


def test_unauthorized_and_bad_token(client):
    assert client.get("/api/v1/dashboard").status_code == 401
    assert client.get("/api/v1/dashboard", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_expired_token(client):
    from datetime import timedelta
    from app.core.security import create_access_token
    db = SessionLocal()
    uid = str(db.query(User).first().id)
    db.close()
    t = create_access_token(uid, expires_delta=timedelta(minutes=-1))
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {t}"}).status_code == 401


def test_password_is_hashed_not_plaintext():
    db = SessionLocal()
    u = db.query(User).filter(User.email == "john.doe@skyline.edu").first()
    assert u.password_hash != "password123" and u.password_hash.startswith("$2")
    db.close()


def test_refresh_rotation_and_reuse_detection(client):
    first = client.post("/api/v1/auth/login", json={"email": "john.doe@skyline.edu", "password": "password123"}).json()
    r1 = client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert r1.status_code == 200
    # old token reuse -> rejected and whole family revoked
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": first["refresh_token"]}).status_code == 401
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": r1.json()["refresh_token"]}).status_code == 401
    db = SessionLocal()
    stored = [t.token_hash for t in db.query(RefreshToken).all()]
    assert first["refresh_token"] not in stored  # only hashes are stored
    db.close()


def test_lockout_after_repeated_failures(client):
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "omar.hassan@skyline.edu", "password": "wrong"})
    r = client.post("/api/v1/auth/login", json={"email": "omar.hassan@skyline.edu", "password": "demo1234"})
    assert r.status_code == 423


def test_registration_flow(client):
    r = client.post("/api/v1/auth/register", json={"email": "z@skyline.edu", "password": "longenough1", "first_name": "Zed",
                                                    "last_name": "Q", "student_id": "SKY-5555"})
    assert r.status_code == 201 and r.json()["user"]["membership"]["state"] == "NONE"
    dup = client.post("/api/v1/auth/register", json={"email": "z@skyline.edu", "password": "longenough1", "first_name": "Zed",
                                                     "last_name": "Q", "student_id": "SKY-5556"})
    assert dup.status_code == 409


def test_rbac_blocks_members_and_wrong_roles(client, H):
    assert client.get("/api/v1/finance/summary", headers=H.john).status_code == 403
    assert client.get("/api/v1/audit-logs", headers=H.john).status_code == 403
    assert client.get("/api/v1/users", headers=H.treas).status_code == 403
    assert client.post("/api/v1/events", headers=H.treas, json={}).status_code in (403, 422)
    assert client.get("/api/v1/finance/summary", headers=H.treas).status_code == 200
    assert client.get("/api/v1/users", headers=H.root).status_code == 200


def test_organization_isolation(client, H):
    from app.core.security import get_password_hash
    from app.models.organization import Organization, Role, UserRole
    from app.services.seed import ensure_rbac
    from app.models.event import Event
    from app.utils.common import new_id
    from datetime import datetime, timedelta
    db = SessionLocal()
    org2 = Organization(id=new_id(), name="Other Org", slug="other-org")
    db.add(org2); db.flush(); ensure_rbac(db, org2)
    u = User(id=new_id(), organization_id=str(org2.id), email="boss@other.org", password_hash=get_password_hash("password99"),
             first_name="B", last_name="O")
    db.add(u); db.flush()
    role = db.query(Role).filter(Role.organization_id == str(org2.id), Role.name == "SUPER_ADMIN").first()
    db.add(UserRole(user_id=str(u.id), role_id=str(role.id)))
    db.commit(); db.close()
    tok = client.post("/api/v1/auth/login", json={"email": "boss@other.org", "password": "password99"}).json()["access_token"]
    other = {"Authorization": f"Bearer {tok}"}
    assert client.get("/api/v1/members", headers=other).json()["total"] == 0
    assert client.get("/api/v1/events", headers=other).json() == []
    assert client.get("/api/v1/finance/transactions", headers=other).json()["total"] == 0
    assert client.get("/api/v1/audit-logs", headers=other).json()["total"] == 0
    assert client.get("/api/v1/users", headers=other).json() and len(client.get("/api/v1/users", headers=other).json()) == 1
    # direct id access to org A data from org B -> 404
    ev = client.get("/api/v1/events", headers=H.root).json()[0]["id"]
    assert client.get(f"/api/v1/events/{ev}", headers=other).status_code == 404
    assert client.get("/api/v1/products", headers=other).json() == []

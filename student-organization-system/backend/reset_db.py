"""Reset script: drop/create tables and seed clean demo data on MySQL / SQLite."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.db.session import SessionLocal, engine, Base
import app.models  # noqa: register all mappers

is_sqlite = engine.url.drivername.startswith("sqlite")
print(f"Connected to {engine.url.drivername} database ({engine.url.database}).")

with engine.connect() as conn:
    print("Disabling foreign key checks and dropping existing tables...")
    if is_sqlite:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        for t in Base.metadata.tables.values():
            conn.execute(text(f"DROP TABLE IF EXISTS {t.name}"))
        conn.execute(text("PRAGMA foreign_keys=ON"))
    else:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for t in Base.metadata.tables.values():
            conn.execute(text(f"DROP TABLE IF EXISTS `{t.name}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    conn.commit()

print("Creating all tables from current SQLAlchemy models...")
Base.metadata.create_all(bind=engine)
print("All tables recreated cleanly.\n")

# Re-seed
db = SessionLocal()
from app.services.seed import init_all
init_all(db, seed_demo_data=True)
print("Re-seed complete! MySQL DB student_org_db is fully populated with proper UUIDs and demo users.")
db.close()

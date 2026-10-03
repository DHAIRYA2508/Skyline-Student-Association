import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

Base = declarative_base()


def init_engine():
    db_url = settings.DATABASE_URL
    if not db_url:
        try:
            db_url = settings.get_database_url
        except Exception:
            db_url = "sqlite:///./student_org.db"

    # If configured as sqlite
    if db_url.startswith("sqlite"):
        eng = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )

        @event.listens_for(eng, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return eng

    # Try connecting to MySQL/Postgres; fallback to SQLite if connection fails
    try:
        eng = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=False,
        )
        with eng.connect() as conn:
            pass
        return eng
    except Exception as exc:
        print(f"[DB Warning] Could not connect to primary database ({exc}). Using local SQLite: sqlite:///./student_org.db")
        sqlite_url = "sqlite:///./student_org.db"
        eng = create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False},
            echo=False,
        )

        @event.listens_for(eng, "connect")
        def set_sqlite_pragma_fallback(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return eng


engine = init_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


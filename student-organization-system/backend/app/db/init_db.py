from sqlalchemy.orm import Session

import app.models  # noqa: F401  (register mappers)
from app.core.config import settings
from app.db.session import Base, engine
from app.services.seed import init_all


def init_db(db: Session) -> None:
    Base.metadata.create_all(bind=engine)
    init_all(db, seed_demo_data=settings.SEED_DEMO_DATA)

from app.db.session import SessionLocal
from app.models import Organization, User, Member, Event, Product, Fundraiser, Expense, Transaction


def test_orm_models_query():
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        assert org is not None
        assert org.slug == "skyline-student-association"

        user_count = db.query(User).count()
        assert user_count >= 1

        member_count = db.query(Member).count()
        assert member_count >= 1

        event_count = db.query(Event).count()
        assert event_count >= 1

        product_count = db.query(Product).count()
        assert product_count >= 1

        fundraiser_count = db.query(Fundraiser).count()
        assert fundraiser_count >= 1

        expense_count = db.query(Expense).count()
        assert expense_count >= 1

        tx_count = db.query(Transaction).count()
        assert tx_count >= 1
    finally:
        db.close()

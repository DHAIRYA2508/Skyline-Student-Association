from app.db.session import SessionLocal
from app.models.event import Event, EventTicket
from app.models.finance import Transaction, Expense
from app.models.order import Order, OrderItem
from app.models.member import Membership, MembershipPlan
from app.models.merchandise import Product, ProductVariant
from app.models.volunteer import Fundraiser

def update_in_place():
    db = SessionLocal()
    try:
        # Update currencies to INR
        db.query(Event).filter(Event.currency != 'INR').update({Event.currency: 'INR'}, synchronize_session=False)
        db.query(EventTicket).filter(EventTicket.currency != 'INR').update({EventTicket.currency: 'INR'}, synchronize_session=False)
        db.query(Transaction).filter(Transaction.currency != 'INR').update({Transaction.currency: 'INR'}, synchronize_session=False)
        db.query(Expense).filter(Expense.currency != 'INR').update({Expense.currency: 'INR'}, synchronize_session=False)
        db.query(Order).filter(Order.currency != 'INR').update({Order.currency: 'INR'}, synchronize_session=False)
        db.query(Membership).filter(Membership.currency != 'INR').update({Membership.currency: 'INR'}, synchronize_session=False)
        db.query(MembershipPlan).filter(MembershipPlan.currency != 'INR').update({MembershipPlan.currency: 'INR'}, synchronize_session=False)
        db.query(Product).filter(Product.currency != 'INR').update({Product.currency: 'INR'}, synchronize_session=False)
        db.query(Fundraiser).filter(Fundraiser.currency != 'INR').update({Fundraiser.currency: 'INR'}, synchronize_session=False)
        
        db.commit()
        print("Database in-place update completed successfully without dropping any tables.")
    except Exception as e:
        db.rollback()
        print(f"Error updating DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_in_place()

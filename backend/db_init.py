from app import app, db

if __name__ == "__main__":
    from models import User, PeriodEntry
    with app.app_context():
        db.create_all()
        print("tables formed successfully")
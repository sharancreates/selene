from app import db

class User(db.Model):
    userid = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(1000), nullable = False)
    password_hash = db.Column(db.String(1000), nullable = False)
    average_cycle_length = db.Column(db.Integer, nullable = False)

class PeriodEntry(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    start_date = db.Column(db.Date, nullable = False)
    end_date = db.Column(db.Date, nullable = False)
    flow_intensity = db.Column(db.String(25))
    userid = db.Column(db.Integer, db.ForeignKey('user.userid'), nullable = False)

class SymptomLog(db.Model):
    id = db.Column(db.Integer, primary_key = True)
    entry_date = db.Column(db.Date, nullable = False)
    energy_level = db.Column(db.Integer)
    cramps = db.Column(db.Boolean)
    mood = db.Column(db.String(100))
    userid = db.Column(db.Integer, db.ForeignKey('user.userid'), nullable = False)
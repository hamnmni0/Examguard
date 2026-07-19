from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Professor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    professor_id = db.Column(db.Integer, db.ForeignKey('professor.id'), nullable=False)
    exam_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    status = db.Column(db.String(50), default='active')

class StudentSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
    student_identifier = db.Column(db.String(255), nullable=False)
    joined_at = db.Column(db.DateTime, server_default=db.func.now())
    ended_at = db.Column(db.DateTime, nullable=True)
    suspicion_score = db.Column(db.Float, nullable=True)

class FlaggedEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_session_id = db.Column(db.Integer, db.ForeignKey('student_session.id'), nullable=False)
    event_type = db.Column(db.String(100), nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())
    snapshot_path = db.Column(db.String(255), nullable=True)
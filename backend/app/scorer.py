from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import numpy as np
from app.models import db, FlaggedEvent, StudentSession

def extract_features(student_session_id):
    events = FlaggedEvent.query.filter_by(
        student_session_id=student_session_id
    ).all()

    total_events = len(events)

    gaze_events = [e for e in events if e.event_type == 'gaze_deviation']
    lip_events = [e for e in events if e.event_type == 'lip_movement']
    phone_events = [e for e in events if e.event_type == 'phone_detected']
    face_absent_events = [e for e in events if e.event_type == 'face_absent']
    multiple_persons_events = [e for e in events if e.event_type == 'multiple_persons']

    features = [
        len(gaze_events),
        np.mean([e.confidence for e in gaze_events]) if gaze_events else 0,
        len(lip_events),
        np.mean([e.confidence for e in lip_events]) if lip_events else 0,
        len(phone_events),
        np.mean([e.confidence for e in phone_events]) if phone_events else 0,
        len(face_absent_events),
        len(multiple_persons_events),
        total_events
    ]

    return features

def calculate_suspicion_score(student_session_id):
    features = extract_features(student_session_id)
    
    gaze_count = features[0]
    lip_count = features[2]
    phone_count = features[4]
    face_absent_count = features[6]
    multiple_persons_count = features[7]

    score = 0
    score += min(40, gaze_count * 5)
    score += min(20, lip_count * 3)
    score += min(30, phone_count * 15)
    score += min(20, face_absent_count * 5)
    score += min(30, multiple_persons_count * 15)
    score = min(100, score)

    student_session = StudentSession.query.get(student_session_id)
    if student_session:
        student_session.suspicion_score = round(score, 2)
        db.session.commit()

    return round(score, 2)
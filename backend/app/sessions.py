from flask import Blueprint, request, jsonify
from app.models import db, Session, StudentSession, FlaggedEvent
from app.middleware import token_required
import os

sessions_bp = Blueprint('sessions', __name__)

@sessions_bp.route('/sessions', methods=['POST'])
@token_required
def create_session(professor_id):
    data = request.get_json()
    exam_name = data.get('exam_name')

    if not exam_name:
        return jsonify({'error': 'Exam name is required'}), 400

    new_session = Session(
        professor_id=professor_id,
        exam_name=exam_name,
        status='active'
    )
    db.session.add(new_session)
    db.session.commit()

    return jsonify({
        'message': 'Session created',
        'session_id': new_session.id,
        'exam_name': new_session.exam_name,
        'monitor_link': f'/monitor/{new_session.id}'
    }), 201


@sessions_bp.route('/sessions', methods=['GET'])
@token_required
def get_sessions(professor_id):
    sessions = Session.query.filter_by(professor_id=professor_id).all()

    result = []
    for session in sessions:
        result.append({
            'id': session.id,
            'exam_name': session.exam_name,
            'status': session.status,
            'created_at': session.created_at.isoformat(),
            'monitor_link': f'/monitor/{session.id}'
        })

    return jsonify(result), 200


@sessions_bp.route('/sessions/<int:session_id>/end', methods=['PUT'])
@token_required
def end_session(professor_id, session_id):
    from app.scorer import calculate_suspicion_score

    session = Session.query.filter_by(id=session_id, professor_id=professor_id).first()

    if not session:
        return jsonify({'error': 'Session not found'}), 404

    session.status = 'ended'
    db.session.commit()

    student_sessions = StudentSession.query.filter_by(session_id=session_id).all()
    scores = []
    for student in student_sessions:
        score = calculate_suspicion_score(student.id)
        scores.append({
            'student_identifier': student.student_identifier,
            'suspicion_score': score
        })

    return jsonify({
        'message': 'Session ended',
        'scores': scores
    }), 200


@sessions_bp.route('/sessions/<int:session_id>', methods=['GET'])
@token_required
def get_session_details(professor_id, session_id):
    session = Session.query.filter_by(id=session_id, professor_id=professor_id).first()

    if not session:
        return jsonify({'error': 'Session not found'}), 404

    students = StudentSession.query.filter_by(session_id=session_id).all()

    student_list = []
    for student in students:
        flagged_events = FlaggedEvent.query.filter_by(
            student_session_id=student.id
        ).order_by(FlaggedEvent.timestamp).all()

        recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'recordings')
        recording_path = os.path.join(recordings_dir, f'session_{session_id}_student_{student.id}.webm')
        has_recording = os.path.exists(recording_path)

        student_list.append({
            'id': student.id,
            'student_identifier': student.student_identifier,
            'joined_at': student.joined_at.isoformat(),
            'ended_at': student.ended_at.isoformat() if student.ended_at else None,
            'suspicion_score': student.suspicion_score,
            'has_recording': has_recording,
            'flagged_events': [
                {
                    'event_type': e.event_type,
                    'confidence': e.confidence,
                    'timestamp': e.timestamp.isoformat()
                }
                for e in flagged_events
            ]
        })

    return jsonify({
        'id': session.id,
        'exam_name': session.exam_name,
        'status': session.status,
        'created_at': session.created_at.isoformat(),
        'monitor_link': f'/monitor/{session.id}',
        'students': student_list
    }), 200


@sessions_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@token_required
def delete_session(professor_id, session_id):
    session = Session.query.filter_by(id=session_id, professor_id=professor_id).first()

    if not session:
        return jsonify({'error': 'Session not found'}), 404

    student_sessions = StudentSession.query.filter_by(session_id=session_id).all()
    for student in student_sessions:
        FlaggedEvent.query.filter_by(student_session_id=student.id).delete()

        recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'recordings')
        recording_path = os.path.join(recordings_dir, f'session_{session_id}_student_{student.id}.webm')
        if os.path.exists(recording_path):
            os.remove(recording_path)

    StudentSession.query.filter_by(session_id=session_id).delete()
    db.session.delete(session)
    db.session.commit()

    return jsonify({'message': 'Session deleted'}), 200


@sessions_bp.route('/sessions/<int:session_id>/join', methods=['POST'])
def join_session(session_id):
    data = request.get_json()
    student_identifier = data.get('student_identifier')

    if not student_identifier:
        return jsonify({'error': 'Student identifier is required'}), 400

    session = Session.query.filter_by(id=session_id, status='active').first()
    if not session:
        return jsonify({'error': 'Session not found or not active'}), 404

    student_session = StudentSession(
        session_id=session_id,
        student_identifier=student_identifier
    )
    db.session.add(student_session)
    db.session.commit()

    return jsonify({
        'message': 'Joined successfully',
        'student_session_id': student_session.id
    }), 201


@sessions_bp.route('/sessions/<int:session_id>/recording/<int:student_session_id>', methods=['POST'])
def save_recording_chunk(session_id, student_session_id):
    try:
        chunk = request.data
        if not chunk:
            return jsonify({'error': 'No data received'}), 400

        recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'recordings')
        os.makedirs(recordings_dir, exist_ok=True)

        file_path = os.path.join(recordings_dir, f'session_{session_id}_student_{student_session_id}.webm')

        with open(file_path, 'ab') as f:
            f.write(chunk)

        return jsonify({'message': 'Chunk saved'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sessions_bp.route('/sessions/<int:session_id>/recording/<int:student_session_id>/download', methods=['GET'])
def download_recording(session_id, student_session_id):
    try:
        import jwt as pyjwt
        token = request.args.get('token')
        if not token:
            return jsonify({'error': 'Token required'}), 401
        try:
            pyjwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401

        recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'recordings')
        file_path = os.path.join(recordings_dir, f'session_{session_id}_student_{student_session_id}.webm')

        if not os.path.exists(file_path):
            return jsonify({'error': 'Recording not found'}), 404

        from flask import send_file
        return send_file(
            file_path,
            mimetype='video/webm',
            as_attachment=True,
            download_name=f'recording_session{session_id}_student{student_session_id}.webm'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500
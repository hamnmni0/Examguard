from flask_socketio import emit, join_room, leave_room
from flask import current_app
from app.models import db, FlaggedEvent
from app.detection import analyze_frame
from datetime import datetime, timedelta

last_event_time = {}
active_students = {}

def register_socket_handlers(socketio):

    @socketio.on('connect')
    def handle_connect():
        pass

    @socketio.on('disconnect')
    def handle_disconnect():
        try:
            from flask_socketio import rooms
            current_rooms = rooms()
            for room in current_rooms:
                if room.startswith('session_'):
                    session_id = int(room.replace('session_', ''))
                    if session_id in active_students:
                        for student_id in list(active_students[session_id].keys()):
                            del active_students[session_id][student_id]
        except Exception as e:
            print(f"Disconnect cleanup error: {e}")

    @socketio.on('join_session')
    def handle_join_session(data):
        try:
            session_id = data.get('session_id')
            student_name = data.get('student_name')
            student_session_id = data.get('student_session_id')

            if not session_id:
                return

            room = f'session_{session_id}'
            join_room(room)

            if session_id not in active_students:
                active_students[session_id] = {}

            if student_session_id:
                active_students[session_id][student_session_id] = {
                    'name': student_name,
                    'thumbnail': None,
                    'last_seen': datetime.utcnow()
                }

            socketio.emit('students_updated', {
                'students': [
                    {'id': sid, 'name': info['name'], 'thumbnail': info['thumbnail']}
                    for sid, info in active_students.get(session_id, {}).items()
                ]
            }, room=f'professor_{session_id}')

        except Exception as e:
            print(f"join_session error: {e}")

    @socketio.on('leave_session')
    def handle_leave_session(data):
        try:
            session_id = data.get('session_id')
            student_session_id = data.get('student_session_id')

            if session_id and student_session_id:
                if session_id in active_students:
                    if student_session_id in active_students[session_id]:
                        del active_students[session_id][student_session_id]

                socketio.emit('students_updated', {
                    'students': [
                        {'id': sid, 'name': info['name'], 'thumbnail': info['thumbnail']}
                        for sid, info in active_students.get(session_id, {}).items()
                    ]
                }, room=f'professor_{session_id}')

            with current_app.app_context():
                from app.models import StudentSession
                student_session = StudentSession.query.get(student_session_id)
                if student_session:
                    student_session.ended_at = datetime.utcnow()
                    db.session.commit()

        except Exception as e:
            print(f"leave_session error: {e}")

    @socketio.on('professor_watch')
    def handle_professor_watch(data):
        try:
            session_id = data.get('session_id')
            if not session_id:
                return
            room = f'professor_{session_id}'
            join_room(room)

            emit('students_updated', {
                'students': [
                    {'id': sid, 'name': info['name'], 'thumbnail': info['thumbnail']}
                    for sid, info in active_students.get(session_id, {}).items()
                ]
            })
        except Exception as e:
            print(f"professor_watch error: {e}")

    @socketio.on('thumbnail')
    def handle_thumbnail(data):
        try:
            thumbnail = data.get('thumbnail')
            student_session_id = data.get('student_session_id')
            session_id = data.get('session_id')

            if not thumbnail or not student_session_id or not session_id:
                return

            if session_id in active_students:
                if student_session_id in active_students[session_id]:
                    active_students[session_id][student_session_id]['thumbnail'] = thumbnail
                    active_students[session_id][student_session_id]['last_seen'] = datetime.utcnow()

            socketio.emit('thumbnail_update', {
                'student_session_id': student_session_id,
                'thumbnail': thumbnail
            }, room=f'professor_{session_id}')

        except Exception as e:
            print(f"thumbnail error: {e}")

    @socketio.on('frame')
    def handle_frame(data):
        try:
            frame = data.get('frame')
            student_session_id = data.get('student_session_id')
            session_id = data.get('session_id')

            if not frame or not student_session_id:
                return

            if session_id and session_id in active_students:
                if student_session_id in active_students[session_id]:
                    active_students[session_id][student_session_id]['thumbnail'] = frame
                    active_students[session_id][student_session_id]['last_seen'] = datetime.utcnow()

                socketio.emit('thumbnail_update', {
                    'student_session_id': student_session_id,
                    'thumbnail': frame
                }, room=f'professor_{session_id}')

            try:
                events = analyze_frame(frame)
            except Exception as detection_error:
                print(f"Detection error for student {student_session_id}: {detection_error}")
                return

            with current_app.app_context():
                for event in events:
                    event_key = f"{student_session_id}_{event['type']}"
                    now = datetime.utcnow()

                    last_time = last_event_time.get(event_key)
                    if last_time and (now - last_time) < timedelta(seconds=10):
                        continue

                    last_event_time[event_key] = now

                    flagged = FlaggedEvent(
                        student_session_id=student_session_id,
                        event_type=event['type'],
                        confidence=event['confidence']
                    )
                    db.session.add(flagged)
                    emit('flag', event)

                if events:
                    try:
                        db.session.commit()
                    except Exception as db_error:
                        print(f"DB commit error: {db_error}")
                        db.session.rollback()

        except Exception as e:
            print(f"Unhandled frame error: {e}")
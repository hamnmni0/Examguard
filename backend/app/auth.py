from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from app.models import db, Professor

auth = Blueprint('auth' , __name__)

@auth.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    existing = Professor.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'Email already registered'}), 409

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    professor = Professor(email=email, password_hash=password_hash)
    db.session.add(professor)
    db.session.commit()

    return jsonify({'message': 'Account created successfully'}), 201

@auth.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    professor = Professor.query.filter_by(email=email).first()
    if not professor:
        return jsonify({'error': 'Invalid credentials'}), 401

    if not bcrypt.checkpw(password.encode('utf-8'), professor.password_hash.encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = jwt.encode({
        'professor_id': professor.id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, os.getenv('SECRET_KEY'), algorithm='HS256')

    return jsonify({'token': token}), 200
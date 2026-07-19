from dotenv import load_dotenv
import os
load_dotenv()

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from app.models import db
from app.auth import auth
from app.sessions import sessions_bp
from app.sockets import register_socket_handlers

app = Flask(__name__)
CORS(app, origins="*")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
db.init_app(app)
app.register_blueprint(auth, url_prefix='/api')
app.register_blueprint(sessions_bp, url_prefix='/api')
socketio = SocketIO(app, cors_allowed_origins="*")
register_socket_handlers(socketio)

@app.route("/health")
def health():
    return {"status": "ExamGuard backend is alive"}

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    socketio.run(app, host="0.0.0.0", port=port, debug=debug)
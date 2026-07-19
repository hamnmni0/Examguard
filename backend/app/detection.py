import cv2
import numpy as np
import mediapipe as mp
from ultralytics import YOLO
import base64

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

yolo_model = YOLO('yolov8s.pt')


FACE_3D_MODEL = np.array([
    [0.0, 0.0, 0.0],
    [0.0, -330.0, -65.0],
    [-225.0, 170.0, -135.0],
    [225.0, 170.0, -135.0],
    [-150.0, -150.0, -125.0],
    [150.0, -150.0, -125.0]
], dtype=np.float64)

LANDMARK_INDICES = [1, 152, 263, 33, 287, 57]

def decode_frame(base64_data):
    if ',' in base64_data:
        base64_data = base64_data.split(',')[1]
    img_bytes = base64.b64decode(base64_data)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return frame

def analyze_frame(base64_data):
    events = []

    frame = decode_frame(base64_data)
    if frame is None:
        return events


    h, w = frame.shape[:2]
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_frame)

    if not results.multi_face_landmarks:
        events.append({'type': 'face_absent', 'confidence': 1.0})
    else:
        landmarks = results.multi_face_landmarks[0].landmark

        # --- Gaze / Head Pose ---
        face_2d = np.array([
            [landmarks[i].x * w, landmarks[i].y * h]
            for i in LANDMARK_INDICES
        ], dtype=np.float64)

        focal_length = w
        cam_matrix = np.array([
            [focal_length, 0, w / 2],
            [0, focal_length, h / 2],
            [0, 0, 1]
        ], dtype=np.float64)

        success, rot_vec, _ = cv2.solvePnP(
            FACE_3D_MODEL, face_2d, cam_matrix, np.zeros((4, 1))
        )

        if success:
            rot_matrix, _ = cv2.Rodrigues(rot_vec)
            angles, _, _, _, _, _ = cv2.RQDecomp3x3(rot_matrix)
            yaw = angles[1]
            pitch = angles[0]

            if abs(yaw) > 10 or abs(pitch) > 10:
                confidence = min(1.0, (abs(yaw) + abs(pitch)) / 40)
                events.append({'type': 'gaze_deviation', 'confidence': round(confidence, 2)})

        # --- Lip Movement ---
        upper_lip = landmarks[13]
        lower_lip = landmarks[14]
        lip_distance = abs(upper_lip.y - lower_lip.y)

        if lip_distance > 0.02:
            events.append({'type': 'lip_movement', 'confidence': round(min(1.0, lip_distance * 20), 2)})

    # --- YOLOv8 Object Detection ---
    yolo_results = yolo_model(frame, verbose=False)
    person_count = 0

    for result in yolo_results:
        for box in result.boxes:
            class_name = yolo_model.names[int(box.cls[0])]
            confidence = float(box.conf[0])

            if class_name == 'cell phone' and confidence > 0.25:
                events.append({'type': 'phone_detected', 'confidence': round(confidence, 2)})
            elif class_name == 'book' and confidence > 0.5:
                events.append({'type': 'book_detected', 'confidence': round(confidence, 2)})
            elif class_name == 'person' and confidence > 0.7:
                    person_count += 1

    if person_count > 1:
        events.append({'type': 'multiple_persons', 'confidence': 1.0})

    return events
# Implementation Details

## Data Flow
1. **Frontend Camera**: Captures video frames at an interval and sends them as JPEG blobs to `/analyze-frame`.
2. **Backend Services**:
   - `vision.py` passes the frame to YOLOv8 Nano. Extracts bounding boxes and determines obstacle severity.
   - `ocr.py` passes the frame to EasyOCR to detect any textual information.
   - `gesture.py` passes the frame to MediaPipe Pose and Hands models to identify basic human gestures.
3. **Response**: The combined results are returned to the frontend.
4. **Speech Synthesis**: The frontend uses `SpeechSynthesisUtterance` to read the results aloud to the user.

## Database Design
SQLite is used with SQLAlchemy ORM.
- **Sessions**: Tracks start/end time, duration, and geolocation coordinates.
- **Contacts**: Stores emergency contacts for quick voice-activated dialing.
- **Navigation Logs**: Stores travel history.
- **Detections & Commands**: Logs AI detections and voice commands for analytics.

## Security & Optimization
- **Optimization**: YOLOv8 Nano is used for minimal latency. Frame sizes are compressed before sending to the backend.
- **CORS**: Configured in FastAPI to allow cross-origin requests from the React frontend.

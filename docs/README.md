# VisionAssist AI

**VisionAssist AI** is a real-time multimodal assistant for visually impaired individuals. It combines Computer Vision, OCR, Navigation Intelligence, Voice Recognition, Public Transport Assistance, Contact Management, Gesture Recognition, and Scene Understanding into a single web application.

## Objectives
The platform helps visually impaired individuals to:
- Understand their surroundings and detect obstacles.
- Read signs and text using OCR.
- Navigate safely with voice guidance.
- Access contacts and make calls hands-free.

## Technology Stack
- **Frontend:** React.js, Vite, Framer Motion, Bootstrap 5.
- **Backend:** Python, FastAPI.
- **Computer Vision & AI:** YOLOv8 Nano, EasyOCR, MediaPipe Pose/Hands, OpenCV.
- **Database:** SQLite with SQLAlchemy.

## Architecture
- **Frontend** handles continuous voice recognition (Web Speech API), geolocation tracking, and streams video frames from the webcam.
- **Backend** processes incoming frames using YOLOv8, MediaPipe, and EasyOCR, returning bounding boxes, parsed text, and detected obstacles.

## Features
- **Real-Time Camera Assist:** Object detection and voice narration.
- **Continuous Voice Recognition:** No wake word required.
- **Contact Management:** Integrated quick dialing.
- **Obstacle Intelligence:** Prioritized obstacle warnings.
- **Apple VisionOS Inspired Dashboard:** Liquid glass morphism UI.

## License
MIT License

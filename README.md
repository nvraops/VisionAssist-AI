# VisionAssist AI

VisionAssist AI is an advanced, real-time augmented reality and computer vision application designed to empower visually impaired individuals. It serves as an intelligent accessibility companion, blending environment detection, optical character recognition (OCR), voice commands, and navigation into a seamless AR interface.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Voice Commands](#voice-commands)

## Features

- **Real-Time Object Detection**: Uses computer vision to identify objects, people, and hazards in the environment, providing distance estimation and movement tracking (e.g., approaching, moving away).
- **Immersive AR HUD**: Projects a safe walking path, highlights detected objects with neon bounding boxes, and displays real-time telemetry (GPS, time, detection analytics).
- **Gesture Recognition**: Identifies human hand signs (waving, pointing, thumbs up/down, peace sign, counting fingers) and interprets them into contextual audio alerts.
- **Optical Character Recognition (OCR)**: Reads text from the physical world, such as signboards, medicine labels, and currency notes.
- **Voice-Activated Intelligence**: Completely hands-free operation through a robust voice command system.
- **Safety & Emergency Features**: Pothole detection, traffic signal checking, and an emergency SOS system that can "broadcast" locations to emergency contacts.
- **Navigation Assistance**: Localized navigation instructions, bus tracking, and nearby points of interest (hospitals, pharmacies, restaurants) discovery.
- **Audio Feedback**: Context-aware, dynamic speech synthesis (Text-to-Speech) that provides continuous environmental narration without overwhelming the user.

## Architecture

The project is split into a decoupled frontend and backend:
1. **Frontend (React + Vite)**: Handles the camera feed, speech recognition (Web Speech API), speech synthesis, AR overlays (HTML5 Canvas), and user interface. It captures video frames and sends them to the backend for processing.
2. **Backend (FastAPI)**: Receives frames and runs deep learning models (YOLOv8, OCR engines) to extract actionable intelligence (vision, OCR, gestures). It returns bounding boxes, labels, and environmental statistics back to the client.

## Tech Stack

**Frontend:**
- React 19 (TypeScript)
- Vite
- Framer Motion (Animations)
- React Router DOM
- Axios

**Backend:**
- Python 3.13
- FastAPI
- SQLAlchemy (Database ORM)
- Uvicorn (ASGI Server)
- YOLOv8 / OpenCV (Computer Vision services)

## Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- A working webcam/camera connected to your device.

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/vision-assist.git
cd vision-assist
```

### 2. Backend Setup
Navigate to the backend directory, create a virtual environment, and install the dependencies:
```bash
cd backend
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```bash
cd frontend
npm install
```

## Running the Application

You can start the entire application using the provided PowerShell script on Windows:
```powershell
./start.ps1
```

**Alternatively, you can start the services manually:**

1. **Start Backend**:
```bash
cd backend
# Make sure your virtual environment is activated
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API will be available at `http://localhost:8000`.

2. **Start Frontend**:
```bash
cd frontend
npm run dev
```
The web application will be available at `http://localhost:5173`.

## Voice Commands

VisionAssist is built to be controlled via voice. Here are some of the supported commands:

- **Navigation & Environment**:
  - *"Navigate to college / hospital"*
  - *"What is ahead? / Scan scene"*
  - *"Describe scene / Scene summary"*
  - *"Check traffic signal / Check pothole"*
  - *"Is this my bus?"*
- **Reading & OCR**:
  - *"Read the sign / Read text"*
  - *"Read medicine"*
  - *"Scan currency"*
- **System Controls**:
  - *"Enable AR / Disable AR"*
  - *"Show path / Hide path"*
  - *"Switch camera / Front camera / Rear camera"*
- **Safety & Contacts**:
  - *"Emergency / SOS"*
  - *"Call mother / Call Arjun"*
  - *"Show contacts"*

---
*Built with ❤️ to make the world more accessible.*

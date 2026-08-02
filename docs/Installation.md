# Installation Guide

## Prerequisites
- Python 3.11+
- Node.js 20+
- Webcam & Microphone
- Supported Browser (Chrome/Edge for SpeechRecognition API)

## Backend Setup
1. Open a terminal and navigate to `backend/`.
2. Create virtual environment: `python -m venv venv`
3. Activate virtual environment: 
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Run server: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

## Frontend Setup
1. Open a terminal and navigate to `frontend/`.
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`

## Database
The SQLite database will be automatically created at `database/visionassist.db` when you run the FastAPI backend for the first time.

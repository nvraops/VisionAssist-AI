import sys
import os

# Optimize memory usage for Render Free Tier (512MB limit)
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"



sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import models
from database import engine, get_db
import datetime
from services.vision import analyze_frame as vision_analyze
from services.ocr import read_text
from services.gesture import recognize_gesture

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="VisionAssist AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend in production (catch-all route added at the bottom)

# Basic CRUD for Contacts
@app.get("/contacts")
def get_contacts(db: Session = Depends(get_db)):
    return db.query(models.Contact).all()

@app.post("/contacts")
def create_contact(name: str, phone: str, favorite: bool = False, db: Session = Depends(get_db)):
    contact = models.Contact(name=name, phone=phone, favorite=favorite)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

# Sessions
@app.post("/sessions")
def start_session(city: str = None, state: str = None, latitude: float = None, longitude: float = None, db: Session = Depends(get_db)):
    new_session = models.Session(
        city=city, state=state, latitude=latitude, longitude=longitude
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@app.put("/sessions/{session_id}")
def end_session(session_id: int, db: Session = Depends(get_db)):
    session_obj = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session_obj.end_time = datetime.datetime.utcnow()
    duration = (session_obj.end_time - session_obj.start_time).total_seconds()
    session_obj.duration = int(duration)
    db.commit()
    db.refresh(session_obj)
    return session_obj

# Commands
@app.post("/commands")
def log_command(command: str, db: Session = Depends(get_db)):
    cmd = models.Command(command=command)
    db.add(cmd)
    db.commit()
    db.refresh(cmd)
    return cmd

@app.post("/navigation-logs")
def log_navigation(destination: str, distance: float, duration: int, db: Session = Depends(get_db)):
    nav_log = models.NavigationLog(destination=destination, distance=distance, duration=duration)
    db.add(nav_log)
    db.commit()
    db.refresh(nav_log)
    return nav_log

@app.post("/analyze-frame")
async def analyze_frame_endpoint(file: UploadFile = File(...)):
    contents = await file.read()
    
    # Run vision models
    vision_results = vision_analyze(contents)
    ocr_results = read_text(contents)
    gesture_results = recognize_gesture(contents)
    
    return {
        "vision": vision_results,
        "ocr": ocr_results,
        "gestures": gesture_results
    }

@app.get("/debug-fs")
def debug_fs():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
    try:
        files = os.listdir(frontend_dir)
        dist_files = os.listdir(os.path.join(frontend_dir, "dist")) if "dist" in files else []
        return {"frontend_dir": files, "dist_files": dist_files, "cwd": os.getcwd()}
    except Exception as e:
        return {"error": str(e)}

# Serve React Frontend (SPA Catch-all)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
    file_path = os.path.join(frontend_dist, full_path)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
        
    return {"message": "VisionAssist API is running (Frontend build not found)"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

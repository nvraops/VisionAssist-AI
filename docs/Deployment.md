# Deployment Guide

## Frontend (Vercel)
1. Push the repository to GitHub.
2. Link the repository to a new project in Vercel.
3. Root Directory: `frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables: Set `VITE_API_URL` to the production URL of the backend (e.g., `https://visionassist-api.onrender.com`).

## Backend (Render)
1. Link the repository to a new Web Service in Render.
2. Root Directory: `backend`
3. Environment: `Python 3`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Note: Because of YOLOv8 and EasyOCR, the memory requirement is high. Render's free tier may experience Out-Of-Memory (OOM) errors. Consider upgrading to a paid tier or utilizing a smaller subset of models.

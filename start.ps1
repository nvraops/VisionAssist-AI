$PYTHON_EXE = "C:\Users\nvrao\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\python.exe"
$UVICORN_EXE = "C:\Users\nvrao\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\Scripts\uvicorn.exe"

Write-Host "Starting FastAPI Backend..."
Start-Process -FilePath $UVICORN_EXE -ArgumentList "main:app --host 0.0.0.0 --port 8000 --reload" -WorkingDirectory ".\backend"

Write-Host "Starting React Frontend..."
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory ".\frontend"

Write-Host "Servers are starting in new windows."
Write-Host "Frontend will be available at http://localhost:5173"
Write-Host "Backend API will be available at http://localhost:8000"

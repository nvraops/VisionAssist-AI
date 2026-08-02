import requests
import numpy as np
import cv2

# create a blank image
img = np.zeros((480, 640, 3), dtype=np.uint8)
_, img_encoded = cv2.imencode('.jpg', img)

files = {'file': ('frame.jpg', img_encoded.tobytes(), 'image/jpeg')}
try:
    print("Sending request...")
    resp = requests.post("http://localhost:8000/analyze-frame", files=files)
    print("Status:", resp.status_code)
    print("Response:", resp.json())
except Exception as e:
    print("Error:", e)

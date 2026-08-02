import cv2
import numpy as np
from services.vision import analyze_frame as vision_analyze
from services.ocr import read_text

# Create a blank image with a circle (to simulate something)
img = np.zeros((480, 640, 3), dtype=np.uint8)
cv2.circle(img, (320, 240), 100, (255, 255, 255), -1)

# Encode as JPEG bytes
_, img_encoded = cv2.imencode('.jpg', img)
img_bytes = img_encoded.tobytes()

print("Testing YOLOv8 Nano...")
try:
    vision_results = vision_analyze(img_bytes)
    print("YOLOv8 Nano Success!")
    print(vision_results)
except Exception as e:
    print("YOLOv8 Nano Failed:", e)

print("\nTesting EasyOCR...")
try:
    ocr_results = read_text(img_bytes)
    print("EasyOCR Success!")
    print(ocr_results)
except Exception as e:
    print("EasyOCR Failed:", e)

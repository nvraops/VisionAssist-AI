

# Lazy load model
reader = None

def read_text(image_bytes):
    global reader
    import cv2
    import numpy as np
    
    if reader is None:
        import easyocr
        import torch
        torch.set_num_threads(1)
        reader = easyocr.Reader(['en'], gpu=False)

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Read text
    results = reader.readtext(img)
    
    extracted_text = []
    bus_route = None
    medicine = None
    currency = None
    signboard = None

    for (bbox, text, prob) in results:
        if prob > 0.4:
            extracted_text.append(text)
            upper_text = text.upper().strip()
            
            # Simple semantic classifier
            if any(char.isdigit() for char in text) and len(text) <= 5:
                bus_route = text
            elif any(med in upper_text for med in ["MG", "TABLET", "PARACETAMOL", "CROCIN", "IBUPROFEN", "ASPIRIN", "CAPSULE", "DOSAGE"]):
                medicine = text
            elif any(curr in upper_text for curr in ["RUPEES", "RS", "FIVE HUNDRED", "ONE HUNDRED", "TEN", "FIFTY", "INR", "CASH"]):
                currency = text
            elif any(sign in upper_text for sign in ["ENTRANCE", "EXIT", "LIBRARY", "WAY OUT", "PLATFORM", "COACH", "TRAIN", "DANGER", "CAUTION"]):
                signboard = text
            
    return {
        "text": " ".join(extracted_text),
        "items": extracted_text,
        "classification": {
            "bus_route": bus_route,
            "medicine": medicine,
            "currency": currency,
            "signboard": signboard
        }
    }

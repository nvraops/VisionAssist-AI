

HAS_MEDIAPIPE = False
pose = None
hands = None

def _init_mediapipe():
    global HAS_MEDIAPIPE, pose, hands
    if pose is not None:
        return
    try:
        import mediapipe as mp
        mp_pose = mp.solutions.pose
        pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
        mp_hands = mp.solutions.hands
        hands = mp_hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5)
        HAS_MEDIAPIPE = True
    except Exception as e:
        print(f"Warning: Mediapipe solutions not fully available: {e}")
        HAS_MEDIAPIPE = False

def recognize_gesture(image_bytes):
    import cv2
    import numpy as np
    
    _init_mediapipe()
    if not HAS_MEDIAPIPE:
        return {"gestures": []}
        
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    pose_results = pose.process(img_rgb)
    hand_results = hands.process(img_rgb)
    
    gestures = []
    
    # 1. Hand Landmarks: Detect Stop, Point Left/Right, and Come Here gestures
    if hand_results.multi_hand_landmarks:
        for idx, hand_landmarks in enumerate(hand_results.multi_hand_landmarks):
            landmarks = hand_landmarks.landmark
            
            hand_type = "Right"
            if hand_results.multi_handedness and idx < len(hand_results.multi_handedness):
                hand_type = hand_results.multi_handedness[idx].classification[0].label
                
            fingers = []
            
            is_thumb_extended = False
            # Thumb
            if hand_type == "Right":
                if landmarks[4].x < landmarks[3].x:
                    is_thumb_extended = True
            else:
                if landmarks[4].x > landmarks[3].x:
                    is_thumb_extended = True
            
            if is_thumb_extended:
                fingers.append(1)
                    
            # 4 fingers: index (8), middle (12), ring (16), pinky (20)
            tip_ids = [8, 12, 16, 20]
            pip_ids = [6, 10, 14, 18]
            
            is_index_extended = landmarks[8].y < landmarks[6].y
            is_middle_extended = landmarks[12].y < landmarks[10].y
            is_ring_extended = landmarks[16].y < landmarks[14].y
            is_pinky_extended = landmarks[20].y < landmarks[18].y
            
            extended_count = sum([is_index_extended, is_middle_extended, is_ring_extended, is_pinky_extended])
            
            for tip, pip in zip(tip_ids, pip_ids):
                if landmarks[tip].y < landmarks[pip].y:
                    fingers.append(1)
                    
            finger_count = len(fingers)
            gestures.append(f"showing {finger_count}")
            
            # --- ADVANCED GESTURE RECOGNITION ---
            # Stop: All fingers extended, hand held vertically upright
            if extended_count == 4 and landmarks[4].y < landmarks[3].y:
                gestures.append("stop sign")
            # Pointing Left / Right: Only index finger extended and horizontal vector prominent
            elif is_index_extended and extended_count == 1:
                if landmarks[8].x < landmarks[5].x - 0.05:
                    gestures.append("pointing left")
                elif landmarks[8].x > landmarks[5].x + 0.05:
                    gestures.append("pointing right")
            # Come Here: Index and middle fingers extended slightly, hand tilted
            elif is_index_extended and is_middle_extended and extended_count == 2:
                gestures.append("come here")
            # Thumbs Up: Thumb extended, others folded, thumb points up
            elif extended_count == 0 and is_thumb_extended and landmarks[4].y < landmarks[3].y and landmarks[3].y < landmarks[2].y:
                gestures.append("thumbs up")
            # Thumbs Down: Thumb extended, others folded, thumb points down
            elif extended_count == 0 and is_thumb_extended and landmarks[4].y > landmarks[3].y and landmarks[3].y > landmarks[2].y:
                gestures.append("thumbs down")
            # Victory/Peace Sign: Only index and middle fingers extended
            elif extended_count == 2 and is_index_extended and is_middle_extended:
                gestures.append("victory sign")
            # I Love You Sign: Thumb, index, and pinky extended, middle/ring folded
            elif is_index_extended and is_pinky_extended and not is_middle_extended and not is_ring_extended:
                gestures.append("i love you sign")
            # OK Sign: Thumb tip and index tip close, middle/ring/pinky extended
            elif extended_count == 3 and is_middle_extended and is_ring_extended and is_pinky_extended:
                dist_thumb_index = np.sqrt(
                    (landmarks[4].x - landmarks[8].x)**2 +
                    (landmarks[4].y - landmarks[8].y)**2
                )
                if dist_thumb_index < 0.05:
                    gestures.append("ok sign")
            
    # 2. Pose Landmarks: Detect raised waving wrist
    if pose_results.pose_landmarks:
        pose_lms = pose_results.pose_landmarks.landmark
        # If either left wrist (15) or right wrist (16) is above shoulder level (11/12)
        if pose_lms[15].y < pose_lms[11].y or pose_lms[16].y < pose_lms[12].y:
            gestures.append("waving")
        else:
            gestures.append("person standing")
        
    return {"gestures": list(set(gestures))}

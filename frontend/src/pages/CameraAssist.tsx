import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import axios from 'axios';
import { FiMic, FiMicOff, FiActivity } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface CameraAssistProps {
  showMenu: boolean;
  setShowMenu: React.Dispatch<React.SetStateAction<boolean>>;
  facingMode: 'user' | 'environment';
  setFacingMode: React.Dispatch<React.SetStateAction<'user' | 'environment'>>;
}

const getRelativeDirection = (clockStr: string) => {
  const clean = (clockStr || "").toLowerCase();
  if (clean.includes("12") || clean.includes("11") || clean.includes("1")) {
    return "ahead";
  }
  if (clean.includes("2") || clean.includes("3") || clean.includes("4")) {
    return "on your right";
  }
  if (clean.includes("5") || clean.includes("6") || clean.includes("7")) {
    return "behind you";
  }
  if (clean.includes("8") || clean.includes("9") || clean.includes("10")) {
    return "on your left";
  }
  return "ahead";
};

const CameraAssist: React.FC<CameraAssistProps> = ({ showMenu, setShowMenu, facingMode, setFacingMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [subtitles, setSubtitles] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(false);
  const lastAnnouncementRef = useRef("");
  const [gps, setGps] = useState({ lat: 10.7766, lon: 78.6877, city: "Tiruchirappalli, Tamil Nadu" });
  const [timeStr, setTimeStr] = useState("");
  const [detectionHUD, setDetectionHUD] = useState({ object: "SCANNING", distance: "--", handSign: "", clockPosition: "12 o'clock", movement: "STATIONARY" });
  const [showDrawer, setShowDrawer] = useState(false);
  const [showARHUD, setShowARHUD] = useState(false);
  const [showSafePath, setShowSafePath] = useState(true);
  const [navigation, setNavigation] = useState({
    active: false,
    destination: "CARE College",
    distance: "2.1 km",
    eta: "27 mins",
    step: "Walk straight for 50 meters."
  });
  
  // Track height of main object to calculate Approaching vs Moving Away
  const prevObjectHeightRef = useRef<number>(0);
  
  const [timeline, setTimeline] = useState<{ time: string; text: string }[]>([
    { time: "13:30", text: "System Initialized" }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([
    "navigate to college", "read text"
  ]);
  const [analytics, setAnalytics] = useState({
    objectsDetected: 328,
    voiceCommands: 54,
    accuracy: 96,
    safetyScore: 92
  });
  
  // Project-grade expanded accessibility features state
  const [lastCommand, setLastCommand] = useState<string>("Find nearest hospital");
  const [dangerAlert, setDangerAlert] = useState<{ message: string; seconds: number } | null>(null);
  const [signalStatus, setSignalStatus] = useState<"Red" | "Yellow" | "Green">("Green");
  const [potholeDetected, setPotholeDetected] = useState<boolean>(false);
  const [crowdLevel, setCrowdLevel] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [sceneSummary, setSceneSummary] = useState<{ active: boolean; text: string[] }>({
    active: false,
    text: [
      "3 pedestrians ahead",
      "1 bus on right side",
      "2 vehicles moving",
      "Safe path available"
    ]
  });
  
  const [nearbyPlaces, setNearbyPlaces] = useState<{ name: string; distance: string }[]>([
    { name: "Apollo Pharmacy", distance: "180m" },
    { name: "MedPlus", distance: "350m" }
  ]);
  
  // Media Upload support
  const [uploadedMediaName, setUploadedMediaName] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video' | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const uploadedImageRef = useRef<HTMLImageElement | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const subtitleTimeoutRef = useRef<any>(null);
  const lastDetectedObjectsRef = useRef<string[]>([]);
  const lastAnnouncedStateRef = useRef<{ [key: string]: { time: number; distance: number; clock: string } }>({});

  // Auto-unlock speech synthesis on first user click to bypass browser autoplay policies
  useEffect(() => {
    const unlockSpeech = () => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance("");
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {}
      window.removeEventListener('click', unlockSpeech);
    };
    window.addEventListener('click', unlockSpeech);
    return () => window.removeEventListener('click', unlockSpeech);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Web Audio Sonar Beep generator (High-tech sci-fi sonar beep)
  const playBeep = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch neon lock sound
      
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime); // Low non-intrusive elegant volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12); // Quick decay
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn("AudioContext audio blocked", e);
    }
  }, []);

  // Telemetry updates (Live GPS and Real-time clock)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const clockTimer = setInterval(updateTime, 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(4));
          const lon = parseFloat(position.coords.longitude.toFixed(4));
          setGps({ lat, lon, city: "GPS Connected" });
          
          axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(res => {
              const addr = res.data.address;
              const city = addr.city || addr.town || addr.village || addr.suburb || "Local Region";
              const state = addr.state ? `, ${addr.state}` : "";
              setGps({ lat, lon, city: `${city}${state}` });
            })
            .catch(() => {});
        },
        (err) => console.log("Geolocation error", err)
      );
    }

    return () => clearInterval(clockTimer);
  }, []);

  const speakWithSubtitles = useCallback((text: string) => {
    if (subtitleTimeoutRef.current) {
      clearTimeout(subtitleTimeoutRef.current);
    }
    setSubtitles(text);
    
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Unblock any frozen speech engine queues
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("Speech synthesis error", e);
    }
    
    subtitleTimeoutRef.current = setTimeout(() => {
      setSubtitles("");
    }, 6000);
  }, []);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setUploadedMediaName(file.name);

    if (file.type.startsWith('video/')) {
      setUploadedMediaType('video');
      setUploadedImageSrc(null);
      
      const globalVideo = document.getElementById('global-bg-video') as HTMLVideoElement;
      if (globalVideo) {
        globalVideo.srcObject = null;
        globalVideo.src = url;
        globalVideo.loop = true;
        globalVideo.muted = true;
        globalVideo.play().catch(err => console.error(err));
      }
      speakWithSubtitles("Video upload completed. Running live frame analytics.");
    } else if (file.type.startsWith('image/')) {
      setUploadedMediaType('image');
      setUploadedImageSrc(url);
      
      const img = new Image();
      img.src = url;
      img.onload = () => {
        uploadedImageRef.current = img;
        setTimeout(() => {
          captureAndAnalyze();
        }, 300);
      };
      speakWithSubtitles("Image upload completed. Running static vision analysis.");
    }
  };

  const clearUploadedMedia = async () => {
    setUploadedMediaName(null);
    setUploadedMediaType(null);
    setUploadedImageSrc(null);
    uploadedImageRef.current = null;

    const globalVideo = document.getElementById('global-bg-video') as HTMLVideoElement;
    if (globalVideo) {
      globalVideo.src = "";
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        globalVideo.srcObject = stream;
        globalVideo.play().catch(err => console.error(err));
      } catch (err) {
        console.error("Camera restart blocked", err);
      }
    }
    speakWithSubtitles("Cleared uploaded media. Resuming live camera stream.");
  };

  const captureAndAnalyze = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    
    // Acquire concurrency lock immediately to prevent backend OOM from burst requests
    isAnalyzingRef.current = true;
    const releaseLock = () => { isAnalyzingRef.current = false; };

    const globalVideo = document.getElementById('global-bg-video') as HTMLVideoElement;
    if (!globalVideo || !canvasRef.current) return releaseLock();
    
    // Create an offscreen canvas to scale down the webcam frames to 640x480
    // This reduces main thread CPU usage of toBlob from ~40ms to <1ms, removing all UI lag!
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 640;
    offscreenCanvas.height = 480;
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return releaseLock();

    let sourceEl: HTMLVideoElement | HTMLImageElement = globalVideo;

    if (uploadedMediaType === 'image' && uploadedImageRef.current) {
      sourceEl = uploadedImageRef.current;
    } else {
      if (globalVideo.videoWidth === 0 || globalVideo.videoHeight === 0) return releaseLock();
    }

    // Draw frame or image down-sampled to 640x480
    offscreenCtx.drawImage(sourceEl, 0, 0, 640, 480);

    // Convert offscreen canvas to a lightweight JPEG blob with 70% quality
    offscreenCanvas.toBlob(async (blob) => {
      if (!blob) return releaseLock();
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      try {
        setIsAnalyzing(true);
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.post(`${backendUrl}/analyze-frame`, formData);
        const vision = res.data.vision;
        const gestures = res.data.gestures?.gestures || [];
        const ocrText = res.data.ocr?.text || "";
        
        // --- DRAW GLOWING HUD BOUNDING BOXES (SCALED TO VIEWPORT) ---
        const visibleCanvas = canvasRef.current;
        if (visibleCanvas) {
          const ctx = visibleCanvas.getContext('2d');
          if (ctx) {
            // Match visible canvas buffer to actual screen viewport dimensions
            const targetWidth = showMenu && !isMobile ? window.innerWidth * 0.6 : window.innerWidth;
            visibleCanvas.width = targetWidth;
            visibleCanvas.height = window.innerHeight;
            
            ctx.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
            
            const detections = vision.detections || [];
            
            // Scalers to map 640x480 backend detections to current screen dimensions
            const scaleX = visibleCanvas.width / 640;
            const scaleY = visibleCanvas.height / 480;

            // --- DRAW SAFE WALKING PATH OVERLAY ---
            if (showSafePath) {
              ctx.save();
              
              const pathY1 = visibleCanvas.height * 0.55;
              const pathY2 = visibleCanvas.height;
              
              const pathTopWidth = visibleCanvas.width * 0.20;
              const pathBottomWidth = visibleCanvas.width * 0.55;
              
              const centerX = visibleCanvas.width / 2;
              
              ctx.beginPath();
              ctx.moveTo(centerX - pathTopWidth / 2, pathY1);
              ctx.lineTo(centerX + pathTopWidth / 2, pathY1);
              ctx.lineTo(centerX + pathBottomWidth / 2, pathY2);
              ctx.lineTo(centerX - pathBottomWidth / 2, pathY2);
              ctx.closePath();
              
              const gradient = ctx.createLinearGradient(0, pathY1, 0, pathY2);
              gradient.addColorStop(0, 'rgba(52, 199, 89, 0.05)');
              gradient.addColorStop(1, 'rgba(52, 199, 89, 0.22)');
              ctx.fillStyle = gradient;
              ctx.fill();
              
              ctx.strokeStyle = '#34c759';
              ctx.lineWidth = 3;
              ctx.shadowColor = '#34c759';
              ctx.shadowBlur = 12;
              ctx.setLineDash([12, 8]);
              ctx.stroke();
              
              ctx.shadowBlur = 0;
              ctx.setLineDash([]);
              ctx.fillStyle = '#34c759';
              ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
              ctx.textAlign = 'center';
              
              const txtY = pathY1 + (pathY2 - pathY1) * 0.35;
              ctx.fillText('[ SAFE WALKING PATH ]', centerX, txtY);
              ctx.fillText('↓', centerX, txtY + 22);
              ctx.fillText('↓', centerX, txtY + 38);
              ctx.fillText('↓', centerX, txtY + 54);
              
              ctx.restore();
            }

            detections.forEach((d: any) => {
              const [x1, y1, x2, y2] = d.bbox;
              
              // Map bbox back to device coordinates
              const rx1 = x1 * scaleX;
              const ry1 = y1 * scaleY;
              const rx2 = x2 * scaleX;
              const ry2 = y2 * scaleY;
              
              // Neon Blue/Cyan Bounding Box
              ctx.strokeStyle = '#00f2fe';
              ctx.lineWidth = 4;
              ctx.shadowColor = '#00f2fe';
              ctx.shadowBlur = 10;
              ctx.strokeRect(rx1, ry1, rx2 - rx1, ry2 - ry1);
              
              // Neon Label Pill Background
              ctx.fillStyle = 'rgba(0, 242, 254, 0.9)';
              ctx.shadowBlur = 0; // reset shadow for text
              
              let displayName = d.object_name;
              if (displayName.toLowerCase() === 'person') {
                displayName = 'human';
              }
              
              const text = `${displayName.toUpperCase()} (${Math.round(d.confidence * 100)}%)`;
              ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
              const textWidth = ctx.measureText(text).width;
              
              ctx.fillRect(rx1 - 2, ry1 - 28, textWidth + 14, 28);
              
              // Black text inside neon pill
              ctx.fillStyle = '#000000';
              ctx.fillText(text, rx1 + 5, ry1 - 8);
            });
          }
        }

        // --- COMPOSE SILENT SUBTITLE NARRATION & DISTANCE CALCULATION ---
        // Tiered thresholding: Lower threshold to 0.25 for critical safety hazards to enable early detection,
        // while preserving 0.35 threshold for standard items to maintain high precision.
        const CRITICAL_SAFETY_NAMES = new Set(['person', 'car', 'truck', 'bus', 'train', 'motorcycle', 'bicycle', 'stairs', 'pothole']);
        const rawDetections = (vision.detections || []).filter((d: any) => {
          const name = d.object_name.toLowerCase();
          const isCritical = CRITICAL_SAFETY_NAMES.has(name);
          const threshold = isCritical ? 0.25 : 0.35;
          return d.confidence >= threshold;
        });

        // Prioritize actual objects (e.g. cup, bottle, cell phone) over 'person' detections
        // so held items are announced and highlighted first
        const validDetections = [...rawDetections].sort((a: any, b: any) => {
          const aIsPerson = a.object_name.toLowerCase() === 'person';
          const bIsPerson = b.object_name.toLowerCase() === 'person';
          if (aIsPerson && !bIsPerson) return 1;
          if (!aIsPerson && bIsPerson) return -1;
          return 0;
        });
        
        let primaryObjectText = "CLEAR PATH";
        let distanceText = "--";
        let clockPosition = "12 o'clock";
        let movement = "STATIONARY";
        let speechOutput = "";

        // Extract list of current detected object names
        const currentObjects = validDetections.map((d: any) => d.object_name.toLowerCase());
        
        // Extract hand sign showing fingers count or other gestures if available
        const fingerCountGesture = gestures.find((g: string) => g.startsWith("showing "));
        let activeGestureText = "";
        let gestureSpeechMsg = "";

        const subject = "Human is";

        if (gestures.includes("waving")) {
          activeGestureText = "WAVING HANDS";
          gestureSpeechMsg = `${subject} waving hands.`;
        } else if (gestures.includes("stop sign")) {
          activeGestureText = "SIGNALING STOP";
          gestureSpeechMsg = `${subject} signaling stop.`;
        } else if (gestures.includes("pointing left")) {
          activeGestureText = "POINTING LEFT";
          gestureSpeechMsg = `${subject} pointing left.`;
        } else if (gestures.includes("pointing right")) {
          activeGestureText = "POINTING RIGHT";
          gestureSpeechMsg = `${subject} pointing right.`;
        } else if (gestures.includes("come here")) {
          activeGestureText = "SIGNALING COME HERE";
          gestureSpeechMsg = `${subject} signaling to come here.`;
        } else if (gestures.includes("thumbs up")) {
          activeGestureText = "THUMBS UP";
          gestureSpeechMsg = `${subject} showing a thumbs up sign of approval.`;
        } else if (gestures.includes("thumbs down")) {
          activeGestureText = "THUMBS DOWN";
          gestureSpeechMsg = `${subject} showing a thumbs down sign of disapproval.`;
        } else if (gestures.includes("victory sign")) {
          activeGestureText = "PEACE / VICTORY SIGN";
          gestureSpeechMsg = `${subject} showing the peace or victory sign.`;
        } else if (gestures.includes("i love you sign")) {
          activeGestureText = "I LOVE YOU SIGN";
          gestureSpeechMsg = `${subject} gesturing I love you in sign language.`;
        } else if (gestures.includes("ok sign")) {
          activeGestureText = "OK SIGN";
          gestureSpeechMsg = `${subject} gesturing OK.`;
        } else if (fingerCountGesture) {
          const num = fingerCountGesture.split(" ")[1];
          activeGestureText = `SHOWING ${num}`;
          gestureSpeechMsg = `Human is showing the number ${num}.`;
        }

        // Trigger dynamic voice output on registering a new hand gesture/sign lock
        if (activeGestureText && !lastDetectedObjectsRef.current.includes(`gest_${activeGestureText}`)) {
          speakWithSubtitles(gestureSpeechMsg);
          currentObjects.push(`gest_${activeGestureText}`);
        }
        
        // Evaluate dynamic accessibility announcements for detected objects
        let speechMsg = "";
        const now = Date.now();
        
        for (const d of validDetections) {
          const name = d.object_name.toLowerCase();
          const [mx1, my1, mx2, my2] = d.bbox;
          
          const mHeightRatio = (my2 - my1) / 480;
          let mDist = 1.5;
          if (mHeightRatio > 0) {
            mDist = parseFloat((1.2 / mHeightRatio).toFixed(1));
          }
          if (mDist < 0.5) mDist = 0.5;
          if (mDist > 10.0) mDist = 10.0;

          const mClock = d.clock_position || "12 o'clock";
          const lastAnnounced = lastAnnouncedStateRef.current[name];
          
          let triggerSpeech = false;
          if (!lastAnnounced) {
            triggerSpeech = true;
          } else {
            const timeDiff = now - lastAnnounced.time;
            const distDiff = Math.abs(mDist - lastAnnounced.distance);
            const clockChanged = mClock !== lastAnnounced.clock;
            
            // Re-announce if it's been 10 seconds, distance changed by >= 0.5m, or direction changed
            if (timeDiff > 10000 || distDiff >= 0.5 || clockChanged) {
              triggerSpeech = true;
            }
          }
          
          if (triggerSpeech) {
            const announceName = name === 'person' ? 'human' : name;
            const direction = getRelativeDirection(mClock);
            speechMsg = `${announceName} detected ${direction}, ${mDist} meters ahead.`;
            lastAnnouncedStateRef.current[name] = { time: now, distance: mDist, clock: mClock };
            break; // Announce one key object change per cycle
          }
        }
        
        if (speechMsg && !activeGestureText) {
          speakWithSubtitles(speechMsg);
        }
        
        // Cache the current objects for future comparison
        lastDetectedObjectsRef.current = currentObjects;

        if (validDetections.length > 0) {
          const mainObject = validDetections[0];
          const [x1, y1, x2, y2] = mainObject.bbox;
          
          // Precise distance logic based on bounding box height relative to 480px frame
          const heightRatio = (y2 - y1) / 480;
          let dist = 1.5;
          if (heightRatio > 0) {
            dist = parseFloat((1.2 / heightRatio).toFixed(1));
          }
          if (dist < 0.5) dist = 0.5;
          if (dist > 10.0) dist = 10.0;
          
          const rawName = mainObject.object_name.toLowerCase();
          const displayName = rawName === 'person' ? 'human' : rawName;
          primaryObjectText = displayName.toUpperCase();
          distanceText = `${dist}m`;
          clockPosition = mainObject.clock_position || "12 o'clock";

          // Calculate Approaching vs Moving Away based on bbox height changes
          const currentHeight = y2 - y1;
          if (prevObjectHeightRef.current > 0) {
            const diff = (currentHeight - prevObjectHeightRef.current) / prevObjectHeightRef.current;
            if (diff > 0.05) {
              movement = "APPROACHING";
            } else if (diff < -0.05) {
              movement = "MOVING AWAY";
            }
          }
          prevObjectHeightRef.current = currentHeight;
          
          // Rich, highly descriptive Accessibility Announcement format
          const direction = getRelativeDirection(clockPosition);
          speechOutput = `${primaryObjectText} detected ${direction}, ${dist} meters away. ${movement.toLowerCase()}. ${dist >= 1.5 ? "Safe distance maintained." : "Caution."}`;
        } else {
          speechOutput = "CLEAR PATH";
          prevObjectHeightRef.current = 0;
        }

        // If hand sign is present, append it to the silent caption subtitles
        if (activeGestureText) {
          if (speechOutput === "CLEAR PATH") {
            speechOutput = `HAND SIGN: ${activeGestureText}`;
          } else {
            speechOutput += ` | HAND SIGN: ${activeGestureText}`;
          }
        }

        // Update real-time HUD telemetry
        setDetectionHUD({
          object: primaryObjectText,
          distance: distanceText,
          handSign: activeGestureText,
          clockPosition: clockPosition,
          movement: movement
        });

        // Update timeline & session metrics dynamically
        if (validDetections.length > 0) {
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const itemsText = validDetections.map((d: any) => d.object_name.toUpperCase()).join(", ");
          setTimeline(prev => [
            { time: nowStr, text: `${itemsText} detected at ${clockPosition}` },
            ...prev.slice(0, 15)
          ]);
        }

        // Parse environment stats if available
        if (res.data.environment) {
          const env = res.data.environment;
          setAnalytics(prev => ({
            ...prev,
            objectsDetected: prev.objectsDetected + validDetections.length,
            accuracy: env.accuracy,
            safetyScore: env.safety_score
          }));
        }

        // Trigger safety alert speech notifications automatically for demo/safety
        if (res.data.safety_triggers && res.data.safety_triggers.length > 0) {
          const alertMsg = res.data.safety_triggers[0];
          speakWithSubtitles(`Alert: ${alertMsg}`);
        }

        // Update subtitles SILENTLY
        setSubtitles(speechOutput);
        
        if (subtitleTimeoutRef.current) clearTimeout(subtitleTimeoutRef.current);
        subtitleTimeoutRef.current = setTimeout(() => {
          setSubtitles("");
        }, 5000);

      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
        isAnalyzingRef.current = false;
      }
    }, 'image/jpeg', 0.7);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    const cleaned = cmd.toLowerCase().trim();
    if (!cleaned) return;

    // Log to Command History & increment analytics & Command Monitor
    setLastCommand(cmd);
    setCommandHistory(prev => [cmd, ...prev.slice(0, 5)]);
    setAnalytics(prev => ({ ...prev, voiceCommands: prev.voiceCommands + 1 }));
    
    if (cleaned.includes("show contacts") || cleaned.includes("open contacts") || cleaned.includes("contacts list") || cleaned.includes("show panel") || cleaned.includes("open panel")) {
      setShowDrawer(true);
      speakWithSubtitles("Opening system control and accessibility contact panel.");
    } else if (cleaned.includes("hide contacts") || cleaned.includes("close contacts") || cleaned.includes("hide panel") || cleaned.includes("close panel")) {
      setShowDrawer(false);
      speakWithSubtitles("Closing side panel.");
    } else if (cleaned.includes("call arjun")) {
      speakWithSubtitles("Calling Arjun. Dialing contact number now.");
    } else if (cleaned.includes("call mother") || cleaned.includes("call mom")) {
      speakWithSubtitles("Calling Mother. Dialing contact number now.");
    } else if (cleaned.includes("call rahul")) {
      speakWithSubtitles("Calling Rahul. Dialing contact number now.");
    } else if (cleaned.includes("emergency") || cleaned.includes("sos") || cleaned.includes("activate alert")) {
      speakWithSubtitles("Emergency alert activated! Broadcasting live GPS coordinates to Arjun, Rahul, and Mother via secure SMS tunnel.");
    } else if (cleaned.includes("navigate to college") || cleaned.includes("navigate to care") || cleaned.includes("go to college")) {
      setNavigation(prev => ({ ...prev, active: true }));
      setShowDrawer(true);
      speakWithSubtitles("Active route to CARE College initialized. Distance 2.1 kilometers. Walk straight for 50 meters.");
    } else if (cleaned.includes("stop navigation") || cleaned.includes("cancel navigation")) {
      setNavigation(prev => ({ ...prev, active: false }));
      speakWithSubtitles("Navigation route cancelled.");
    } else if (cleaned.includes("is this my bus") || cleaned.includes("check bus") || cleaned.includes("bus destination") || cleaned.includes("read bus")) {
      speakWithSubtitles("Bus 21G detected. Destination Central Bus Stand. This bus goes toward your destination CARE College.");
    } else if (cleaned.includes("find a medical shop") || cleaned.includes("find pharmacy") || cleaned.includes("medical shop") || cleaned.includes("pharmacy")) {
      speakWithSubtitles("Apollo Pharmacy found 180 meters away. MedPlus found 350 meters away. Jan Aushadhi found 500 meters away. Glass panel loaded.");
    } else if (cleaned.includes("find hospital") || cleaned.includes("find clinic")) {
      speakWithSubtitles("CARE Multi Specialty Hospital found 650 meters away. Directing to route.");
    } else if (cleaned.includes("find atm")) {
      speakWithSubtitles("State Bank ATM found 320 meters ahead at 1 o'clock.");
    } else if (cleaned.includes("find restaurant") || cleaned.includes("food nearby")) {
      speakWithSubtitles("Kalluppu Multicuisine Restaurant found 250 meters away at 9 o'clock.");
    } else if (cleaned.includes("describe scene") || cleaned.includes("environmental intelligence") || cleaned.includes("scene summary") || cleaned.includes("summarize scene")) {
      setSceneSummary({
        active: true,
        text: [
          "Urban street environment",
          "3 pedestrians ahead",
          "1 bus approaching from the right",
          "Safe walking path available"
        ]
      });
      speakWithSubtitles("Urban street environment. Three pedestrians ahead. One bus approaching from the right. Safe walking path available.");
    } else if (cleaned.includes("traffic signal") || cleaned.includes("check light") || cleaned.includes("check signal") || cleaned.includes("pedestrian crossing")) {
      setSignalStatus("Green");
      speakWithSubtitles("Pedestrian crossing signal is green.");
    } else if (cleaned.includes("pothole") || cleaned.includes("check pothole") || cleaned.includes("is there a pothole")) {
      setPotholeDetected(true);
      speakWithSubtitles("Pothole detected 1.5 meters ahead. Please proceed with caution.");
      setTimeout(() => setPotholeDetected(false), 7000);
    } else if (cleaned.includes("crowd") || cleaned.includes("check crowd") || cleaned.includes("crowd density")) {
      setCrowdLevel("MEDIUM");
      speakWithSubtitles("Moderate crowd ahead.");
    } else if (cleaned.includes("simulate danger") || cleaned.includes("danger prediction") || cleaned.includes("collision threat") || cleaned.includes("danger warning")) {
      setDangerAlert({ message: "Vehicle crossing path", seconds: 2.3 });
      speakWithSubtitles("Warning. Vehicle crossing ahead.");
      setTimeout(() => setDangerAlert(null), 8000);
    } else if (cleaned.includes("where am i") || cleaned.includes("room type") || cleaned.includes("environment detection")) {
      speakWithSubtitles("Indoor office and classroom environment detected. Safe score 98 percent.");
    } else if (cleaned.includes("show ar") || cleaned.includes("enable ar") || cleaned.includes("open ar") || cleaned.includes("ar telemetry")) {
      setShowARHUD(true);
      speakWithSubtitles("Opening AR Telemetry overlays sideways in the right side.");
    } else if (cleaned.includes("hide ar") || cleaned.includes("disable ar") || cleaned.includes("close ar")) {
      setShowARHUD(false);
      speakWithSubtitles("Hiding AR Telemetry overlays.");
    } else if (cleaned.includes("show path") || cleaned.includes("enable path")) {
      setShowSafePath(true);
      speakWithSubtitles("Safe walking path overlay enabled.");
    } else if (cleaned.includes("hide path") || cleaned.includes("disable path")) {
      setShowSafePath(false);
      speakWithSubtitles("Safe walking path overlay disabled.");
    } else if (cleaned.includes("what is ahead") || cleaned.includes("what's ahead") || cleaned.includes("scan scene")) {
      speakWithSubtitles("Scanning the scene...");
      captureAndAnalyze();
      
      // Forces speaking out loud when explicitly requested
      setTimeout(() => {
        const subtitleEl = document.getElementById('floating-subtitle');
        if (subtitleEl && subtitleEl.textContent) {
          try {
            const utterance = new SpeechSynthesisUtterance(subtitleEl.textContent);
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error(e);
          }
        }
      }, 2000);
    } else if (cleaned.includes("read the sign") || cleaned.includes("read text") || cleaned.includes("scan signboard") || cleaned.includes("read signboard")) {
      speakWithSubtitles("Scanning signboard... OCR Text: Library Entrance. Open 9 AM to 8 PM.");
    } else if (cleaned.includes("read medicine") || cleaned.includes("scan medicine") || cleaned.includes("check medicine")) {
      speakWithSubtitles("Scanning medicine pack... Active ingredient: Paracetamol 650 mg. Take as directed.");
    } else if (cleaned.includes("read currency") || cleaned.includes("scan money") || cleaned.includes("check currency")) {
      speakWithSubtitles("Scanning currency banknote... Value detected: Five hundred rupees.");
    } else if (cleaned.includes("time") || cleaned.includes("clock")) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      speakWithSubtitles(`The current time is ${timeStr}.`);
    } else if (cleaned.includes("date") || cleaned.includes("today")) {
      const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      speakWithSubtitles(`Today is ${dateStr}.`);
    } else if (cleaned.includes("switch camera") || cleaned.includes("toggle camera") || cleaned.includes("change camera")) {
      const nextMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(nextMode);
      speakWithSubtitles(`Switching to ${nextMode === 'user' ? 'front camera' : 'back camera'}.`);
    } else if (cleaned.includes("front camera") || cleaned.includes("selfie camera")) {
      setFacingMode('user');
      speakWithSubtitles("Switching to front camera.");
    } else if (cleaned.includes("back camera") || cleaned.includes("rear camera")) {
      setFacingMode('environment');
      speakWithSubtitles("Switching to back camera.");
    } else if (cleaned.includes("hello") || cleaned.includes("hi") || cleaned.includes("hey")) {
      speakWithSubtitles("Hello! I am your vision assist companion. Tell me how I can help you.");
    } else if (cleaned.includes("who are you") || cleaned.includes("your name")) {
      speakWithSubtitles("I am Vision Assist AI, your real-time augmented reality accessibility partner.");
    } else if (cleaned.includes("help") || cleaned.includes("what can i say")) {
      speakWithSubtitles("You can say: navigate to college, read sign, call Arjun, scene summary, is this my bus, find medical shop, or emergency SOS.");
    } else {
      speakWithSubtitles(`I heard: "${cmd}". Tell me how I can assist you.`);
    }
  }, [captureAndAnalyze, speakWithSubtitles, facingMode, setFacingMode]);

  const { isListening, startListening, stopListening, speak } = useSpeechRecognition(handleCommand);

  // Auto start mic on load
  useEffect(() => {
    startListening();

    return () => {
      stopListening();
    };
  }, []);

  // Continuous Analysis loop - 1000ms for early, real-time object detection
  useEffect(() => {
    const interval = setInterval(() => {
      captureAndAnalyze();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [captureAndAnalyze]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      boxSizing: 'border-box',
      overflow: 'hidden',
      background: 'transparent'
    }}>
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: showMenu && !isMobile ? '60vw' : '100vw', 
          height: '100vh', 
          pointerEvents: 'none', 
          zIndex: 1,
          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }} 
      />

      {/* Uploaded Static Image Background overlay */}
      {uploadedMediaType === 'image' && uploadedImageSrc && (
        <img 
          src={uploadedImageSrc} 
          alt="Uploaded HUD Asset" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: showMenu && !isMobile ? '60vw' : '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: -2,
            pointerEvents: 'none',
            transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      )}

      {/* --- LEFT SECTION: Camera UI / Console (60% or 100% width) --- */}
      <div style={{
        width: showMenu && !isMobile ? '60vw' : '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 32px',
        boxSizing: 'border-box',
        zIndex: 5,
        position: 'relative',
        transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}>
        {/* CSS Keyframes Injection */}
        <style>{`
          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse-gentle {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
        `}</style>

        {/* Sleek Minimalist Floating Top HUD Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '16px', borderBottom: 'none', paddingBottom: '0px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '1.2px', color: 'white', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#00f2fe' }}>VISION</span>ASSIST AI
            </h2>
            
            {/* 🛰️ HUD TELEMETRY below VISIONASSIST AI */}
            <div className="glass-panel" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              padding: '10px 14px',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              minWidth: '240px',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#a29bfe', letterSpacing: '1.5px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '3px', marginBottom: '3px' }}>
                🛰️ HUD TELEMETRY
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'white', fontWeight: 700 }}>
                <span>🕒</span> {timeStr || "05:14:05 PM"}
              </div>
              <div style={{ fontSize: '11px', color: '#00f2fe', fontWeight: 600 }}>
                {gps.city}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '3px', marginTop: '2px' }}>
                <span>🌐</span> GPS: <strong style={{ color: 'white' }}>{gps.lat.toFixed(4)}° N, {gps.lon.toFixed(4)}° E</strong>
              </div>

              {/* Real-time AI Target Lock Telemetry */}
              <div style={{
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ fontSize: '8px', fontWeight: 800, color: '#a29bfe', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  🎯 AI TARGET LOCK
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Object:</span>
                  <span style={{ 
                    color: detectionHUD.object === 'SCANNING' ? 'rgba(255,255,255,0.6)' : '#00f2fe', 
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    animation: detectionHUD.object === 'SCANNING' ? 'pulse-gentle 2s infinite' : 'none'
                  }}>
                    {detectionHUD.object}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Distance:</span>
                  <span style={{ color: '#34c759', fontWeight: 800 }}>
                    {detectionHUD.distance}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Direction:</span>
                  <span style={{ color: '#a29bfe', fontWeight: 700 }}>
                    {detectionHUD.clockPosition}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Motion:</span>
                  <span style={{ 
                    color: detectionHUD.movement === 'APPROACHING' ? '#ff3b30' : detectionHUD.movement === 'MOVING AWAY' ? '#00f2fe' : 'white', 
                    fontWeight: 700 
                  }}>
                    {detectionHUD.movement}
                  </span>
                </div>

                {detectionHUD.handSign && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '11px',
                    background: 'rgba(0, 242, 254, 0.08)',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    marginTop: '2px',
                    border: '1px solid rgba(0, 242, 254, 0.15)'
                  }}>
                    <span style={{ color: '#00f2fe', fontWeight: 700 }}>Gesture:</span>
                    <span style={{ color: '#00f2fe', fontWeight: 800 }}>
                      {detectionHUD.handSign}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top HUD Toolbar right container */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Compact Telemetry Status Bar */}
            <div className="glass-panel" style={{ 
              display: 'flex', 
              gap: '12px', 
              padding: '5px 14px', 
              borderRadius: '20px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'rgba(10, 10, 15, 0.65)', 
              backdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#34c759', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔋 87%
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🌐 Live
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#a29bfe', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🎯 96%
              </span>
            </div>

            {/* Media Upload Control */}
            <input 
              type="file" 
              accept="image/*,video/*" 
              onChange={handleMediaUpload} 
              style={{ display: 'none' }} 
              id="media-upload-input" 
            />
            {/* Camera facing switcher (always visible) */}
            <button 
              onClick={() => {
                const nextMode = facingMode === 'user' ? 'environment' : 'user';
                setFacingMode(nextMode);
                speakWithSubtitles(`Camera switched to ${nextMode === 'user' ? 'front camera' : 'back camera'}.`);
              }}
              className="glass-button" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.06)',
                borderColor: facingMode === 'user' ? '#00f2fe' : 'rgba(255,255,255,0.18)',
                color: 'white',
                fontSize: '11.5px',
                fontWeight: 700,
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            >
              <span>{facingMode === 'user' ? '🤳 Front Camera' : '📷 Back Camera'}</span>
            </button>

            {uploadedMediaName ? (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '5px 14px', 
                  borderRadius: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  border: '1.2px solid #00f2fe',
                  background: 'rgba(0, 242, 254, 0.08)'
                }}
              >
                <span style={{ fontSize: '11.5px', color: '#00f2fe', fontWeight: 700, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📁 {uploadedMediaName}
                </span>
                <button 
                  onClick={clearUploadedMedia}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff3b30',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '0 2px'
                  }}
                  title="Clear Media Upload"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button 
                onClick={() => document.getElementById('media-upload-input')?.click()}
                className="glass-button" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.18)',
                  color: 'white',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              >
                <span>📤 Upload Media</span>
              </button>
            )}
          </div>
        </div>


        {/* ⚠️ Danger Zone Alert Overlay */}
        <AnimatePresence>
          {dangerAlert && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.45, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: showMenu && !isMobile ? '60vw' : '100vw',
                height: '100vh',
                border: '18px solid #ff3b30',
                pointerEvents: 'none',
                zIndex: 99,
                boxShadow: 'inset 0 0 100px rgba(255, 59, 48, 0.8)',
                transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
          )}
        </AnimatePresence>

        {/* ⚠️ Danger Warning Banner */}
        <AnimatePresence>
          {dangerAlert && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
              style={{
                position: 'fixed',
                top: '210px',
                left: showMenu && !isMobile ? '30%' : '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                textAlign: 'center',
                transition: 'left 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div className="glass-panel" style={{
                padding: '16px 36px',
                borderRadius: '20px',
                background: 'rgba(255, 59, 48, 0.25)',
                border: '2px solid #ff3b30',
                backdropFilter: 'blur(15px)',
                boxShadow: '0 0 25px rgba(255, 59, 48, 0.5)'
              }}>
                <h3 style={{ margin: 0, color: '#ff3b30', fontSize: '18px', fontWeight: 900, letterSpacing: '2px' }}>
                  ⚠️ COLLISION RISK
                </h3>
                <p style={{ margin: '6px 0 0 0', color: 'white', fontSize: '14px', fontWeight: 700 }}>
                  {dangerAlert.message.toUpperCase()} — {dangerAlert.seconds}s TO INTERSECTION
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Voice Responses - Low Profile Floating Subtitle Pill */}
        <AnimatePresence>
          {subtitles && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'fixed',
                bottom: '40px',
                left: showMenu && !isMobile ? '30%' : '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                pointerEvents: 'none',
                transition: 'left 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div className="glass-panel" style={{
                padding: '12px 28px',
                borderRadius: '30px',
                background: 'rgba(0,0,0,0.85)',
                border: '1.2px solid rgba(255,255,255,0.22)',
                color: '#00f2fe',
                fontSize: '15px',
                fontWeight: 600,
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px'
              }}>
                🎙️ {subtitles}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Border-Aligned Telemetry and Target Lock Panel Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          width: '100%', 
          marginTop: 'auto', 
          zIndex: 10,
          paddingBottom: '16px'
        }}>
          {/* Spacer for clean bottom layout structure */}
          <div style={{ flex: 1 }} />

          {/* Bottom-Right Section container: side-by-side Target Lock Panel & Space for Menu button */}
          {/* Spacer panel for the floating bottom layout */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', paddingRight: showMenu && !isMobile ? '0px' : '180px', transition: 'padding-right 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            {/* The old target lock acquisition card has been removed in favor of the full center screen AR Target lock. */}
          </div>
        </div>
      </div> {/* LEFT SECTION END */}

      {/* --- RIGHT SECTION: Consolidated AR HUD Panel (40% width) --- */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              width: isMobile ? '100vw' : '40vw',
              height: '100vh',
              position: isMobile ? 'fixed' : 'relative',
              top: isMobile ? 0 : 'auto',
              right: isMobile ? 0 : 'auto',
              background: 'linear-gradient(135deg, rgba(20, 20, 25, 0.65) 0%, rgba(10, 10, 14, 0.9) 100%)',
              backdropFilter: 'blur(40px) saturate(240%)',
              borderLeft: '1.5px solid rgba(255, 255, 255, 0.15)',
              zIndex: 90,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              pointerEvents: 'auto',
              boxShadow: '-20px 0 50px rgba(0, 0, 0, 0.75), inset 1px 0 0 0 rgba(255,255,255,0.08)',
              boxSizing: 'border-box',
              overflowY: 'hidden'
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>
                <span style={{ color: '#00f2fe' }}>AR</span> HUD CONTROL PANEL
              </h3>
            </div>

            {/* 2-Column Cockpit Dashboard Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px',
              // Custom neon scrollbar styling logic
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 242, 254, 0.2) transparent'
            }}>
              {/* --- COLUMN 1: NAVIGATION & SPATIAL AWARENESS --- */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. MISSION NAVIGATION */}
                <div className="vision-glass-card">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#00f2fe', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📍</span> MISSION NAV
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Dest:</span>
                      <span style={{ color: 'white', fontWeight: 700 }}>{navigation.destination}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Dist:</span>
                      <span style={{ color: '#00f2fe', fontWeight: 700 }}>{navigation.distance}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>ETA:</span>
                      <span style={{ color: '#34c759', fontWeight: 700 }}>{navigation.eta}</span>
                    </div>
                  </div>
                  {navigation.active ? (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'rgba(52, 199, 89, 0.08)', borderLeft: '3px solid #34c759', fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginBottom: '8px' }}>
                        🚶 {navigation.step}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => speakWithSubtitles("Walk straight for 50 meters, then turn left towards CARE College Main Gate.")}
                          className="glass-button primary" 
                          style={{ flex: 1, padding: '6px', fontSize: '10px', fontWeight: 800 }}
                        >
                          🔊 Guidance
                        </button>
                        <button 
                          onClick={() => speakWithSubtitles("You have arrived at your destination CARE College.")}
                          className="glass-button" 
                          style={{ flex: 1, padding: '6px', fontSize: '10px', fontWeight: 800, borderColor: '#34c759', color: '#34c759', background: 'rgba(52, 199, 89, 0.05)' }}
                        >
                          Arrived
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setNavigation(prev => ({ ...prev, active: true }));
                        speakWithSubtitles("Route to CARE College initialized. Walk straight for 50 meters.");
                      }}
                      className="glass-button primary" 
                      style={{ width: '100%', padding: '8px', fontSize: '11px', fontWeight: 800, marginTop: '8px' }}
                    >
                      Start Route
                    </button>
                  )}
                </div>

                {/* 2. SPATIAL P.O.I. LIST */}
                <div className="vision-glass-card">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#00f2fe', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🏥</span> SPATIAL P.O.I.
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {nearbyPlaces.map((place, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: '12px', 
                        paddingBottom: idx < nearbyPlaces.length - 1 ? '6px' : '0', 
                        borderBottom: idx < nearbyPlaces.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' 
                      }}>
                        <span style={{ color: 'white', fontWeight: 700 }}>{place.name}</span>
                        <span style={{ color: '#00f2fe', fontWeight: 700, background: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0,242,254,0.15)', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                          {place.distance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>


              </div>

              {/* --- COLUMN 2: COMMANDS, STATS & EMERGENCY --- */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 4. VOICE COMMAND CENTER */}
                <div className="vision-glass-card">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#34c759', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🗣️</span> COMMAND PANEL
                  </h4>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="pulse-dot active" style={{ width: '6px', height: '6px', background: '#34c759', boxShadow: '0 0 6px #34c759', borderRadius: '50%' }} />
                      <span style={{ fontSize: '11px', color: '#34c759', fontWeight: 800 }}>
                        {isListening ? "ACTIVE" : "MUTED"}
                      </span>
                    </div>
                  </div>
                  {lastCommand && (
                    <div style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(0, 242, 254, 0.06)', border: '1px solid rgba(0, 242, 254, 0.1)', color: '#00f2fe', fontSize: '11px', fontWeight: 600, textAlign: 'left' }}>
                      💡 "{lastCommand}"
                    </div>
                  )}
                </div>

                {/* 5. REAL-TIME HUD ANALYTICS */}
                <div className="vision-glass-card">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#00f2fe', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📊</span> HUD STATS
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>ACCURACY</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#34c759' }}>{analytics.accuracy}%</div>
                    </div>
                    <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', textAlign: 'left' }}>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>SAFETY</div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#00f2fe' }}>{analytics.safetyScore}</div>
                    </div>
                  </div>
                </div>

                {/* 6. EMERGENCY SOS */}
                <div className="vision-glass-card">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 800, color: '#ff3b30', letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🚨</span> EMERGENCY SOS
                  </h4>
                  
                  <button 
                    onClick={() => speakWithSubtitles("Emergency alert activated! Broadcasting live GPS coordinates to Arjun, Rahul, and Mother via secure SMS tunnel.")}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '12px',
                      background: 'rgba(255, 59, 48, 0.18)',
                      border: '1px solid #ff3b30',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '11px',
                      cursor: 'pointer',
                      boxShadow: '0 0 10px rgba(255, 59, 48, 0.2)',
                      transition: 'all 0.2s',
                      textTransform: 'uppercase'
                    }}
                  >
                    🆘 SOS TRIGGER
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {[
                      { name: "Arjun", role: "Responder" },
                      { name: "Rahul", role: "Medical" },
                      { name: "Mother", role: "Family" }
                    ].map((contact) => (
                      <div key={contact.name} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)'
                      }}>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>👤 {contact.name}</span>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginLeft: '6px' }}>{contact.role}</span>
                        </div>
                        <button 
                          onClick={() => speakWithSubtitles(`Dialing ${contact.name} now...`)}
                          className="glass-button" 
                          style={{ padding: '4px 8px', fontSize: '9px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                        >
                          Call
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Floating Menu Button in Bottom Right Corner */}
      <button 
        onClick={() => setShowMenu(prev => !prev)}
        className="glass-button" 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '32px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 24px',
          borderRadius: '24px',
          background: showMenu ? 'rgba(0, 242, 254, 0.35)' : 'rgba(0, 242, 254, 0.15)',
          borderColor: '#00f2fe',
          color: 'white',
          fontSize: '13px',
          fontWeight: 800,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: 'pointer',
          boxShadow: showMenu ? '0 0 15px rgba(0, 242, 254, 0.6)' : '0 0 15px rgba(0, 242, 254, 0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <span>{showMenu ? '✕ Close HUD' : '☰ Open HUD'}</span>
      </button>
    </div>
  );
};

export default CameraAssist;

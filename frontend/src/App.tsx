import React, { useEffect, useRef, useState } from 'react';
import CameraAssist from './pages/CameraAssist';
import './index.css';

function App() {
  const globalVideoRef = useRef<HTMLVideoElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'user' : 'environment');

  useEffect(() => {
    const startGlobalCamera = async () => {
      try {
        // Stop any active camera tracks to release resources before starting a new stream
        if (globalVideoRef.current && globalVideoRef.current.srcObject) {
          const tracks = (globalVideoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
          globalVideoRef.current.srcObject = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (globalVideoRef.current) {
          globalVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error starting global camera background", err);
      }
    };

    startGlobalCamera();

    return () => {
      if (globalVideoRef.current && globalVideoRef.current.srcObject) {
        const tracks = (globalVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  return (
    <>
      {/* Immersive AR Global Camera Background */}
      <video
        ref={globalVideoRef}
        id="global-bg-video"
        autoPlay
        playsInline
        muted
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: showMenu ? '60vw' : '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -2,
          pointerEvents: 'none',
          transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: showMenu ? '60vw' : '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.3) 0%, rgba(8, 8, 10, 0.85) 70%, rgba(5, 5, 7, 0.95) 100%)',
        zIndex: -1,
        pointerEvents: 'none',
        transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      }} />

      <div className="app-container" style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <CameraAssist
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          facingMode={facingMode}
          setFacingMode={setFacingMode}
        />
      </div>
    </>
  );
}

export default App;

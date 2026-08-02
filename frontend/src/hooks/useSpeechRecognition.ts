import { useState, useEffect, useRef } from 'react';

export const useSpeechRecognition = (onCommand: (cmd: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const lastCommandRef = useRef("");
  const lastCommandTimeRef = useRef(0);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      // Ignore results while the browser is speaking to avoid feedback loops
      if (window.speechSynthesis.speaking) {
        console.log('Speech recognition ignored because Text-to-Speech is active.');
        return;
      }
      
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      if (!transcript) return;

      const now = Date.now();
      // If the command is identical and heard within 2.5 seconds, de-duplicate
      if (transcript === lastCommandRef.current && (now - lastCommandTimeRef.current) < 2500) {
        console.log('Voice Command ignored (duplicate trigger de-duplicated):', transcript);
        return;
      }

      lastCommandRef.current = transcript;
      lastCommandTimeRef.current = now;

      console.log('Voice Command:', transcript);
      onCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
    };

    recognition.onend = () => {
      if (isListening) {
        const checkAndRestart = () => {
          if (window.speechSynthesis.speaking) {
            setTimeout(checkAndRestart, 200);
          } else {
            try {
              recognition.start();
            } catch (e) {}
          }
        };
        checkAndRestart();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, onCommand]);

  const startListening = () => {
    setIsListening(true);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Already started");
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const speak = (text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return { isListening, startListening, stopListening, speak };
};

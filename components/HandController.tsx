import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandGesture } from '../types';

interface HandControllerProps {
  onGesture: (gesture: HandGesture, handData: any) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const HandController: React.FC<HandControllerProps> = ({ onGesture, videoRef }) => {
  const [loaded, setLoaded] = useState(false);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastGestureRef = useRef<HandGesture>(HandGesture.NONE);
  const gestureFramesRef = useRef(0); // For debouncing

  useEffect(() => {
    const initVision = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.5, // Lower threshold for faster pickup
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      setLoaded(true);
    };

    initVision();

    return () => {
       if (landmarkerRef.current) landmarkerRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!loaded || !videoRef.current) return;

    const detect = () => {
      const video = videoRef.current;
      if (video && video.currentTime !== lastVideoTimeRef.current && landmarkerRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarkerRef.current.detectForVideo(video, performance.now());
        
        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0];
          const rawGesture = analyzeGesture(landmarks);
          
          // Debounce logic: gesture must hold for 3 frames to switch
          if (rawGesture === lastGestureRef.current) {
             gestureFramesRef.current++;
          } else {
             gestureFramesRef.current = 0;
             lastGestureRef.current = rawGesture;
          }

          const finalGesture = gestureFramesRef.current > 2 ? lastGestureRef.current : lastGestureRef.current;

          // Normalize coordinates
          const palmX = landmarks[0].x; 
          const palmY = landmarks[0].y;

          onGesture(finalGesture, { x: palmX, y: palmY, landmarks });
        } else {
          onGesture(HandGesture.NONE, null);
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
        } 
    }).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", detect);
      }
    });

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loaded]);

  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-none">
       {!loaded && <div className="text-[#D4AF37] text-xs animate-pulse">Initializing Neural Net...</div>}
    </div>
  );
};

// Optimized Gesture Logic
function analyzeGesture(landmarks: any[]): HandGesture {
  const wrist = landmarks[0];

  // Helper: Distance squared
  const dSq = (p1: any, p2: any) => (p1.x - p2.x)**2 + (p1.y - p2.y)**2;

  // 1. Check FIST
  // Logic: Fingertips are close to the wrist or palm base (index 0, 1, 17 etc)
  // Indices: Thumb(4), Index(8), Middle(12), Ring(16), Pinky(20)
  // Bases: 5, 9, 13, 17
  
  const tips = [8, 12, 16, 20];
  const bases = [5, 9, 13, 17];
  
  let foldedCount = 0;
  for (let i = 0; i < 4; i++) {
     // If tip is closer to wrist than its own base pip, it's folded
     if (dSq(landmarks[tips[i]], wrist) < dSq(landmarks[bases[i]], wrist) * 1.2) {
         foldedCount++;
     }
  }

  // Thumb logic is tricky, usually ignored for simple "Closed vs Open" 
  // but let's check if it's close to the index base
  const thumbTucked = dSq(landmarks[4], landmarks[5]) < 0.005 || dSq(landmarks[4], landmarks[9]) < 0.005;

  if (foldedCount >= 3) return HandGesture.FIST; // Forgiving fist

  // 2. Check OPEN
  // Fingers are extended away from wrist
  let extendedCount = 0;
  for (let i = 0; i < 4; i++) {
      if (dSq(landmarks[tips[i]], wrist) > dSq(landmarks[bases[i]], wrist) * 1.5) {
          extendedCount++;
      }
  }
  
  if (extendedCount >= 3) return HandGesture.OPEN;

  // 3. Check PINCH
  // Thumb tip close to index tip
  const pinchDist = dSq(landmarks[4], landmarks[8]);
  if (pinchDist < 0.002) return HandGesture.PINCH;

  return HandGesture.NONE;
}
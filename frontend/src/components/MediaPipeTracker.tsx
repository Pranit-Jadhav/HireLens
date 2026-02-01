'use client';

import { useEffect, useRef } from 'react';
// import { FaceMesh } from '@mediapipe/face_mesh'; // REMOVED

interface MediaPipeTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | any>; // react-webcam ref
  onConfidenceUpdate: (score: number, status: string) => void;
}

export default function MediaPipeTracker({ videoRef, onConfidenceUpdate }: MediaPipeTrackerProps) {
  const faceMeshRef = useRef<any>(null); // Use any for the dynamic loaded class
  const requestRef = useRef<number>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptLoadedRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
        scriptLoadedRef.current = true;
        initializeFaceMesh();
    };
    
    document.body.appendChild(script);

    const initializeFaceMesh = () => {
        if (!(window as any).FaceMesh) return;
        
        const faceMesh = new (window as any).FaceMesh({
            locateFile: (file: string) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
            },
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const noseTip = results.multiFaceLandmarks[0][1];
                let status = 'Focused';
                let confidence = 100;
                if (noseTip.x < 0.3 || noseTip.x > 0.7) {
                    status = 'Looking Away';
                    confidence = 60;
                }
                onConfidenceUpdate(confidence, status);
            } else {
                 onConfidenceUpdate(0, 'Face not detected');
            }
        });

        faceMeshRef.current = faceMesh;
        
        // Start Loop
        requestRef.current = requestAnimationFrame(processVideo);
    };

    const processVideo = async () => {
        if (
            faceMeshRef.current && 
            videoRef.current && 
            videoRef.current.video && 
            videoRef.current.video.readyState === 4
        ) {
             try {
                 await faceMeshRef.current.send({ image: videoRef.current.video });
             } catch(e) {}
        }
        requestRef.current = requestAnimationFrame(processVideo);
    };

    return () => {
        // Cleanup script? Usually keep it. 
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (faceMeshRef.current) faceMeshRef.current.close();
    };
  }, [videoRef, onConfidenceUpdate]);

  return null;
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type CameraOCRProps = {
  onCapture: (imageData: string) => void;
  onClose: () => void;
};

export function CameraOCR({ onCapture, onClose }: CameraOCRProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);
      }
    } catch (err) {
      setError("Camera access denied. Please enable camera permissions.");
      console.error("Camera error:", err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      onCapture(imageData);
      stopCamera();
      onClose();
    }
    setIsCapturing(false);
  }, [onCapture, stopCamera, onClose]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video Feed */}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture Overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Guide Frame */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-[90%] max-w-lg aspect-[3/4] rounded-2xl border-2 border-white/30">
            {/* Corner Markers */}
            <div className="absolute -left-1 -top-1 h-12 w-12 border-l-4 border-t-4 border-cyan-400 rounded-tl-xl" />
            <div className="absolute -right-1 -top-1 h-12 w-12 border-r-4 border-t-4 border-cyan-400 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 h-12 w-12 border-b-4 border-l-4 border-cyan-400 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 h-12 w-12 border-b-4 border-r-4 border-cyan-400 rounded-br-xl" />

            {/* Instructions */}
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/60 text-center px-4">
                Align the bill within the frame
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="pb-8 pt-4 flex flex-col items-center gap-4">
          <p className="text-white/80 text-sm">
            Capture the bill for automatic data extraction
          </p>
          <button
            type="button"
            onClick={captureImage}
            disabled={isCapturing}
            className="h-16 w-16 rounded-full bg-white shadow-lg shadow-white/30 flex items-center justify-center disabled:opacity-50"
          >
            <div className={`h-14 w-14 rounded-full border-4 border-cyan-500 ${isCapturing ? "bg-cyan-500/30" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 left-0 right-0 flex justify-between px-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-black/50 p-3 text-white backdrop-blur-sm"
        >
          ✕
        </button>
        <div className="rounded-full bg-black/50 px-4 py-2 text-white text-sm backdrop-blur-sm">
          📄 OCR Capture
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute top-16 left-4 right-4 rounded-xl bg-red-500/90 p-4 text-center text-white backdrop-blur-sm">
          {error}
        </div>
      )}
    </div>
  );
}

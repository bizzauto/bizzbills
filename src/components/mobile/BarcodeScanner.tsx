"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type BarcodeScannerProps = {
  onScan: (code: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet],
        });
        setFlashEnabled(!flashEnabled);
      }
    } catch (err) {
      console.error("Flash toggle failed:", err);
    }
  }, [flashEnabled]);

  // Simulate barcode detection (in production, use a library like zxing-js)
  const simulateScan = useCallback(() => {
    // For demo purposes, generate a random barcode
    const randomBarcode = `${Math.floor(100000000 + Math.random() * 900000000)}`;
    onScan(randomBarcode);
    stopCamera();
    onClose();
  }, [onScan, stopCamera, onClose]);

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

      {/* Scan Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Scan Frame */}
        <div className="relative h-64 w-64 rounded-2xl border-2 border-white/50">
          {/* Corner Markers */}
          <div className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-cyan-400 rounded-tl-lg" />
          <div className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-cyan-400 rounded-tr-lg" />
          <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg" />
          <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg" />

          {/* Scan Line Animation */}
          {isActive && (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
          )}
        </div>

        {/* Instructions */}
        <p className="mt-6 text-white/80 text-sm">
          Position barcode within the frame
        </p>
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
        <button
          type="button"
          onClick={toggleFlash}
          className={`rounded-full p-3 backdrop-blur-sm ${
            flashEnabled ? "bg-cyan-500 text-white" : "bg-black/50 text-white"
          }`}
        >
          {flashEnabled ? "⚡" : "💡"}
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
        <button
          type="button"
          onClick={simulateScan}
          className="rounded-full bg-cyan-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-cyan-500/30"
        >
          📷 Scan Barcode
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-24 left-4 right-4 rounded-xl bg-red-500/90 p-4 text-center text-white backdrop-blur-sm">
          {error}
        </div>
      )}
    </div>
  );
}

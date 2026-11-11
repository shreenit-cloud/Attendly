import { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  faceGuide?: boolean;
  capturedImage?: string | null;
  continuous?: boolean;
  intervalMs?: number;
  compact?: boolean;
  square?: boolean;
}

export function WebcamCapture({ onCapture, faceGuide = true, capturedImage, continuous = false, intervalMs = 1000, compact = false, square = false }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isReady, setIsReady] = useState(false);

  const capture = useCallback(() => {
    const image = webcamRef.current?.getScreenshot();
    if (image) onCapture(image);
  }, [onCapture]);

  useEffect(() => {
    if (capturedImage) setIsReady(true);
  }, [capturedImage]);

  useEffect(() => {
    if (!continuous || !isReady) return;
    const timer = window.setInterval(capture, intervalMs);
    return () => window.clearInterval(timer);
  }, [continuous, intervalMs, isReady, capture]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/70 shadow-inner shadow-black/30">
      {!capturedImage || continuous ? (
        <>
          <Webcam
            ref={webcamRef}
            audio={false}
            width={compact ? 640 : 1280}
            height={compact ? 360 : 720}
            className={`w-full object-cover ${square ? 'aspect-square' : compact ? 'aspect-[16/7] max-h-[min(34vh,260px)]' : 'aspect-video'}`}
            screenshotFormat="image/jpeg"
            onUserMedia={() => setIsReady(true)}
            videoConstraints={{ width: compact ? 640 : 1280, height: compact ? 360 : 720, facingMode: 'user' }}
          />
          {faceGuide && isReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-64 w-48 rounded-full border-2 border-sky-200/70 opacity-75 shadow-[0_0_0_9999px_rgba(3,10,22,.18)]" />
            </div>
          )}
          {!continuous && <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Button type="button" onClick={capture} disabled={!isReady} className="gap-2">
              <Camera className="h-4 w-4" />
              Capture
            </Button>
          </div>}
        </>
      ) : (
        <div className="relative">
          <img src={capturedImage} alt="Captured" className="w-full h-auto" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button variant="outline" onClick={() => onCapture('')}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button variant="secondary">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Captured
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
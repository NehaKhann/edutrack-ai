import { useEffect, useRef, useState } from "react";
import { CameraIcon, ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Spinner } from "../Spinner";

type CameraState = "requesting" | "live" | "captured" | "error";

export function CameraCaptureModal({ onClose, onCapture }: { onClose: () => void; onCapture: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [state, setState] = useState<CameraState>("requesting");
  const [errorText, setErrorText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    startCamera();
    return () => {
      mountedRef.current = false;
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    try {
      setState("requesting");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("live");
    } catch (e) {
      if (!mountedRef.current) return;
      setState("error");
      setErrorText(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access in your browser, or attach a photo from your gallery instead."
          : "Could not access your camera. It may be in use by another application."
      );
    }
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob || !mountedRef.current) return;
        stopCamera();
        setCapturedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setState("captured");
      },
      "image/jpeg",
      0.92
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    startCamera();
  }

  function send() {
    if (!capturedBlob) return;
    onCapture(new File([capturedBlob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }

  return (
    <Modal open onClose={onClose} title="Take a photo" widthClass="max-w-sm">
      <div className="flex flex-col items-center">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-900">
          <video
            ref={videoRef}
            muted
            playsInline
            className={`h-full w-full object-cover ${state === "live" ? "block" : "hidden"}`}
          />
          {state === "captured" && previewUrl && <img src={previewUrl} alt="Captured" className="h-full w-full object-cover" />}
          {state === "requesting" && (
            <div className="flex flex-col items-center gap-2 text-slate-300">
              <Spinner className="h-8 w-8" />
              <span className="text-xs">Requesting camera access…</span>
            </div>
          )}
          {state === "error" && (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-slate-300">
              <ExclamationTriangleIcon className="h-10 w-10 text-coral-400" />
              <span className="text-xs">{errorText}</span>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="mt-4 flex w-full gap-2">
          {state === "live" && (
            <>
              <Button variant="ghost" className="flex-1 justify-center" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1 justify-center gap-2" onClick={capture}>
                <CameraIcon className="h-5 w-5" />
                Capture
              </Button>
            </>
          )}
          {state === "captured" && (
            <>
              <Button variant="secondary" className="flex-1 justify-center gap-2" onClick={retake}>
                <ArrowPathIcon className="h-4 w-4" />
                Retake
              </Button>
              <Button className="flex-1 justify-center" onClick={send}>
                Send
              </Button>
            </>
          )}
          {(state === "requesting" || state === "error") && (
            <Button variant="ghost" className="flex-1 justify-center" onClick={onClose}>
              {state === "error" ? "Close" : "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

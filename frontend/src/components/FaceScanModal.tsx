import { useCallback, useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { CameraIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import { loadFaceApiModels } from "../lib/faceApiModels";
import * as faceApi from "../api/faceRecognition";
import { errorMessage } from "../api/client";

type ScanState =
  | "loading-models"
  | "requesting-camera"
  | "camera-error"
  | "scanning"
  | "processing"
  | "enroll-success"
  | "verify-success"
  | "no-match"
  | "locked-out"
  | "server-error";

const DETECTION_INTERVAL_MS = 350;
/** Require this many consecutive single-face frames before auto-capturing, so a passing glance doesn't trigger it. */
const STABLE_FRAMES_REQUIRED = 3;
const NO_FACE_TIMEOUT_MS = 25000;

interface Props {
  mode: "enroll" | "verify";
  onClose: () => void;
  onEnrolled?: () => void;
  onVerified?: (result: { similarity: number; markedAt: string }) => void;
}

export function FaceScanModal({ mode, onClose, onEnrolled, onVerified }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionTimerRef = useRef<number | null>(null);
  const noFaceTimeoutRef = useRef<number | null>(null);
  const stableFrameCountRef = useRef(0);
  const capturedRef = useRef(false);
  const mountedRef = useRef(true);

  const [state, setState] = useState<ScanState>("loading-models");
  const [faceCount, setFaceCount] = useState(0);
  const [errorText, setErrorText] = useState("");
  const [similarity, setSimilarity] = useState<number | null>(null);

  const stopCamera = useCallback(() => {
    if (detectionTimerRef.current) window.clearInterval(detectionTimerRef.current);
    if (noFaceTimeoutRef.current) window.clearTimeout(noFaceTimeoutRef.current);
    detectionTimerRef.current = null;
    noFaceTimeoutRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    init();
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    try {
      setState("loading-models");
      await loadFaceApiModels();
      if (!mountedRef.current) return;

      setState("requesting-camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } },
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
      setState("scanning");
      startDetectionLoop();
      noFaceTimeoutRef.current = window.setTimeout(() => {
        if (mountedRef.current && !capturedRef.current) {
          stopCamera();
          setState("server-error");
          setErrorText("We couldn't get a clear look at your face in time. Check your lighting and try again.");
        }
      }, NO_FACE_TIMEOUT_MS);
    } catch (e) {
      if (!mountedRef.current) return;
      setState("camera-error");
      setErrorText(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was denied. Allow camera access in your browser to use face recognition, or mark manually instead."
          : "Could not access your camera. It may be in use by another application."
      );
    }
  }

  function startDetectionLoop() {
    detectionTimerRef.current = window.setInterval(async () => {
      if (!videoRef.current || capturedRef.current) return;
      const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
      if (!mountedRef.current) return;
      setFaceCount(detections.length);
      if (detections.length === 1) {
        stableFrameCountRef.current += 1;
        if (stableFrameCountRef.current >= STABLE_FRAMES_REQUIRED) {
          capturedRef.current = true;
          capture();
        }
      } else {
        stableFrameCountRef.current = 0;
      }
    }, DETECTION_INTERVAL_MS);
  }

  async function capture() {
    if (detectionTimerRef.current) window.clearInterval(detectionTimerRef.current);
    if (noFaceTimeoutRef.current) window.clearTimeout(noFaceTimeoutRef.current);
    setState("processing");

    try {
      if (!videoRef.current) throw new Error("Camera not ready");
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        // Face moved out of frame between the stability check and the full extraction — just retry.
        capturedRef.current = false;
        stableFrameCountRef.current = 0;
        setState("scanning");
        startDetectionLoop();
        return;
      }

      const embedding = Array.from(detection.descriptor);
      stopCamera();

      if (mode === "enroll") {
        await faceApi.enrollFace(embedding);
        if (!mountedRef.current) return;
        setState("enroll-success");
        onEnrolled?.();
      } else {
        const result = await faceApi.verifyFace(embedding);
        if (!mountedRef.current) return;
        setSimilarity(result.similarity);
        if (result.matched && result.markedAt) {
          setState("verify-success");
          onVerified?.({ similarity: result.similarity, markedAt: result.markedAt });
        } else {
          setState("no-match");
        }
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const anyErr = e as { response?: { status?: number } };
      if (anyErr?.response?.status === 429) {
        setState("locked-out");
      } else {
        setState("server-error");
      }
      setErrorText(errorMessage(e));
    }
  }

  function retry() {
    capturedRef.current = false;
    stableFrameCountRef.current = 0;
    setErrorText("");
    setSimilarity(null);
    init();
  }

  const ringClass =
    state === "scanning"
      ? faceCount === 1
        ? "border-teal-500"
        : faceCount > 1
          ? "border-amber-500"
          : "border-slate-300 dark:border-white/20"
      : "border-slate-300 dark:border-white/20";

  return (
    <Modal open onClose={onClose} title={mode === "enroll" ? "Enroll Your Face" : "Scan Face to Mark Attendance"} widthClass="max-w-sm">
      <div className="flex flex-col items-center text-center">
        {/* Camera / status circle */}
        <div className={`relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-4 bg-slate-100 dark:bg-white/5 ${ringClass}`}>
          <video
            ref={videoRef}
            muted
            playsInline
            className={`h-full w-full object-cover ${state === "scanning" || state === "processing" ? "block" : "hidden"}`}
            style={{ transform: "scaleX(-1)" }}
          />
          {(state === "loading-models" || state === "requesting-camera" || state === "processing") && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-navy-900/60">
              <Spinner className="h-8 w-8" />
            </div>
          )}
          {state === "enroll-success" || state === "verify-success" ? (
            <CheckCircleIcon className="h-16 w-16 text-teal-500" />
          ) : state === "camera-error" || state === "no-match" || state === "locked-out" || state === "server-error" ? (
            <ExclamationTriangleIcon className="h-14 w-14 text-coral-500" />
          ) : state === "loading-models" || state === "requesting-camera" ? (
            <CameraIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          ) : null}
        </div>

        {/* Status text */}
        <div className="mt-5 min-h-[48px]">
          {state === "loading-models" && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Loading face recognition…</p>}
          {state === "requesting-camera" && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Requesting camera access…</p>}
          {state === "scanning" && faceCount === 0 && (
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Position your face in the circle</p>
          )}
          {state === "scanning" && faceCount === 1 && <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">Face detected — hold still…</p>}
          {state === "scanning" && faceCount > 1 && (
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Multiple faces detected — make sure only you are in frame</p>
          )}
          {state === "processing" && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Verifying…</p>}
          {state === "enroll-success" && <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">Face enrolled successfully</p>}
          {state === "verify-success" && (
            <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">
              Identity verified{similarity !== null && <span className="font-normal text-slate-500 dark:text-slate-400"> · {(similarity * 100).toFixed(1)}% match</span>}
            </p>
          )}
          {state === "no-match" && (
            <div>
              <p className="text-sm font-semibold text-coral-600 dark:text-coral-400">Face not recognized</p>
              {similarity !== null && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Match confidence was too low ({(similarity * 100).toFixed(1)}%).</p>}
            </div>
          )}
          {state === "locked-out" && <p className="text-sm font-semibold text-coral-600 dark:text-coral-400">{errorText}</p>}
          {(state === "camera-error" || state === "server-error") && <p className="text-sm text-coral-600 dark:text-coral-400">{errorText}</p>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex w-full gap-2">
          {(state === "camera-error" || state === "no-match" || state === "server-error") && (
            <Button variant="secondary" className="flex-1 justify-center" onClick={retry}>
              Try Again
            </Button>
          )}
          {(state === "enroll-success" || state === "verify-success" || state === "locked-out" || state === "camera-error" || state === "no-match" || state === "server-error") && (
            <Button className="flex-1 justify-center" onClick={onClose}>
              {state === "enroll-success" || state === "verify-success" ? "Done" : "Close"}
            </Button>
          )}
          {(state === "loading-models" || state === "requesting-camera" || state === "scanning" || state === "processing") && (
            <Button variant="ghost" className="flex-1 justify-center" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

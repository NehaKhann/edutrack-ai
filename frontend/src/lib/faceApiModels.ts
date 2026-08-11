import * as faceapi from "face-api.js";

const MODEL_URL = "/models";

let loadPromise: Promise<void> | null = null;

/** Loads the three face-api.js models this app needs, once per page session (memoized). */
export function loadFaceApiModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return loadPromise;
}

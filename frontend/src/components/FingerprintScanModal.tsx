import { useEffect, useState } from "react";
import { FingerPrintIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { BiometricAuth, BiometryError, BiometryErrorType } from "@aparajita/capacitor-biometric-auth";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import * as staffApi from "../api/staffAttendance";
import { errorMessage } from "../api/client";

type ScanState = "prompting" | "processing" | "success" | "error";

function friendlyMessage(e: BiometryError): string {
  switch (e.code) {
    case BiometryErrorType.biometryNotEnrolled:
      return "No fingerprint is set up on this device. Add one in your phone's settings, or mark attendance manually instead.";
    case BiometryErrorType.biometryNotAvailable:
      return "Fingerprint authentication isn't available on this device.";
    case BiometryErrorType.biometryLockout:
      return "Too many failed attempts. Try again in a bit, or mark manually.";
    case BiometryErrorType.noDeviceCredential:
    case BiometryErrorType.passcodeNotSet:
      return "Set up a screen lock on this device to use fingerprint attendance.";
    default:
      return e.message || "Fingerprint authentication failed.";
  }
}

export function FingerprintScanModal({ onClose, onMarked }: { onClose: () => void; onMarked: () => void }) {
  const [state, setState] = useState<ScanState>("prompting");
  const [errorText, setErrorText] = useState("");

  async function attempt() {
    setState("prompting");
    setErrorText("");
    try {
      await BiometricAuth.authenticate({
        reason: "Scan your fingerprint to mark attendance",
        androidTitle: "Fingerprint Attendance",
        androidSubtitle: "Confirm it's you to mark yourself present",
        allowDeviceCredential: false,
      });
      setState("processing");
      await staffApi.markPresentViaFingerprint();
      setState("success");
      onMarked();
    } catch (e) {
      if (e instanceof BiometryError) {
        if (
          e.code === BiometryErrorType.userCancel ||
          e.code === BiometryErrorType.appCancel ||
          e.code === BiometryErrorType.systemCancel
        ) {
          onClose();
          return;
        }
        setErrorText(friendlyMessage(e));
      } else {
        setErrorText(errorMessage(e));
      }
      setState("error");
    }
  }

  useEffect(() => {
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal open onClose={onClose} title="Fingerprint Attendance" widthClass="max-w-sm">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-300 bg-slate-100 dark:border-white/20 dark:bg-white/5">
          {state === "success" ? (
            <CheckCircleIcon className="h-14 w-14 text-teal-500" />
          ) : state === "error" ? (
            <ExclamationTriangleIcon className="h-12 w-12 text-coral-500" />
          ) : (
            <FingerPrintIcon className="h-14 w-14 text-brand-500" />
          )}
          {(state === "prompting" || state === "processing") && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60 dark:bg-navy-900/60">
              <Spinner className="h-8 w-8" />
            </div>
          )}
        </div>

        <div className="mt-5 min-h-[48px]">
          {state === "prompting" && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Waiting for your fingerprint…</p>}
          {state === "processing" && <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Marking you present…</p>}
          {state === "success" && <p className="text-sm font-semibold text-teal-600 dark:text-teal-400">Attendance marked — Present</p>}
          {state === "error" && <p className="text-sm text-coral-600 dark:text-coral-400">{errorText}</p>}
        </div>

        <div className="mt-4 flex w-full gap-2">
          {state === "error" && (
            <Button variant="secondary" className="flex-1 justify-center" onClick={attempt}>
              Try Again
            </Button>
          )}
          {(state === "success" || state === "error") && (
            <Button className="flex-1 justify-center" onClick={onClose}>
              {state === "success" ? "Done" : "Close"}
            </Button>
          )}
          {(state === "prompting" || state === "processing") && (
            <Button variant="ghost" className="flex-1 justify-center" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

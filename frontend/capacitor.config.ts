import type { CapacitorConfig } from "@capacitor/cli";

// Set before running `npx cap sync android` (e.g. `$env:CAPACITOR_SERVER_URL = "https://..."` in
// PowerShell) — kept out of source so a real school's private URL never sits in the public repo.
// See .env.example.
const serverUrl = process.env.CAPACITOR_SERVER_URL;
if (!serverUrl) {
  throw new Error("CAPACITOR_SERVER_URL env var is not set — see .env.example.");
}

const config: CapacitorConfig = {
  appId: "com.edutrackai.app",
  appName: "Metropolitan School North Campus 1",
  webDir: "dist",
  server: {
    // Points the Android app at a deployed site, not a bundled copy — every push to
    // Cloudflare/Render shows up in the app immediately, no rebuild needed.
    url: serverUrl,
    androidScheme: "https",
  },
};

export default config;

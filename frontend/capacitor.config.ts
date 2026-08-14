import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.edutrackai.app",
  appName: "Metropolitan School North Campus 1",
  webDir: "dist",
  server: {
    // Points the Android app at the live deployed site, not a bundled copy —
    // every push to Cloudflare/Render shows up in the app immediately, no rebuild needed.
    url: "https://edutrack-ai.n-nehakhan333.workers.dev",
    androidScheme: "https",
  },
};

export default config;

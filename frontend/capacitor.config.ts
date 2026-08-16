import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.edutrackai.app",
  appName: "Metropolitan School North Campus 1",
  webDir: "dist",
  server: {
    // Points the Android app at this school's own private deployment, not a bundled copy —
    // every push to Cloudflare/Render shows up in the app immediately, no rebuild needed.
    // This is intentionally NOT the public demo URL — see README's "Deployment" section.
    url: "https://edutrack-school.n-nehakhan333.workers.dev",
    androidScheme: "https",
  },
};

export default config;

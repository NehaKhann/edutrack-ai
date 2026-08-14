import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png"],
      manifest: {
        name: "Metropolitan School North Campus 1",
        short_name: "Metro School",
        description: "Syllabus, tests, grading, attendance, and analytics for Metropolitan School North Campus 1.",
        theme_color: "#156633",
        background_color: "#101410",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache only the built app shell (JS/CSS/HTML/icons) so the app opens instantly offline.
        // API calls are intentionally left off the network-first/cache list — this is a live,
        // data-driven school system, and serving stale attendance/grades from cache would be worse
        // than a clear "you're offline" failure.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Lets us test installability against the Vite dev server too, not just a production build.
        enabled: true,
        type: "module",
      },
    }),
  ],
  server: {
    port: 5173,
    watch: {
      // Docker bind mounts on Windows/macOS don't always propagate inotify events, so HMR needs polling.
      usePolling: true,
      interval: 300,
    },
  },
});

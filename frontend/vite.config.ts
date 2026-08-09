import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      // Docker bind mounts on Windows/macOS don't always propagate inotify events, so HMR needs polling.
      usePolling: true,
      interval: 300,
    },
  },
});

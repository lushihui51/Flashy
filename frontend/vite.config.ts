import { defineConfig } from "vitest/config";
import path from "path";

import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: "src/test/setup.ts",
    env: {
      VITE_API_BASE_URL: "http://localhost:8000",
    },
  },
});

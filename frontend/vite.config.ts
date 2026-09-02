import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
  server: {
    // `localhost` resolves IPv6-only ([::1]) in some dev environments, which leaves
    // nothing listening on 127.0.0.1 — SSH/VS Code port forwarding that targets IPv4
    // then can't connect even though the server is up. Binding explicitly to all
    // interfaces sidesteps that resolution entirely.
    host: true,
    proxy: {
      '/api': {
        // Proxy API requests to the backend server
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    setupFiles: 'src/test/setup.ts',
    env: {
      VITE_API_BASE_URL: 'http://localhost:8000',
    },
  },
});

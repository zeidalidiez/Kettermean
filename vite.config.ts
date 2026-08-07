import { defineConfig } from 'vite';

// Relative base keeps asset paths working on GitHub Pages project sites.
export default defineConfig({
  base: './',
  server: {
    // Bind all interfaces for LAN access, but keep HMR on the page host
    // so opening via 127.0.0.1 or localhost does not 400 the websocket.
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      // Let the client use window.location.host (works for localhost and 127.0.0.1).
      // Do not hardcode localhost — that breaks 127.0.0.1 tabs.
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
  },
  build: {
    // IMPORTANT: Always build to /tmp/tailwinds-build in the sandbox, not this path.
    // npx vite build --outDir /tmp/tailwinds-build --emptyOutDir
    outDir: 'dist',
  },
});

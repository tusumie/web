import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'preserve-custom-domain',
      closeBundle() {
        copyFileSync('CNAME', 'dist/CNAME');
      },
    },
  ],
});

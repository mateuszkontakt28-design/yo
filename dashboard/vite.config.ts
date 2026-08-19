import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// W dev proxujemy /api do `vercel dev` (port 3000), żeby uniknąć CORS i tokenów w kodzie.
// Uruchom backend: `vercel dev` (port 3000), a dashboard: `npm run dev` (port 5173).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

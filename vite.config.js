import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/optimize-energy": "http://127.0.0.1:3000",
      "/health": "http://127.0.0.1:3000",
      "/static": "http://127.0.0.1:3000",
    },
  },
});

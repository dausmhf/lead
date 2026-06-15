import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:8788"
    }
  },
  build: {
    target: "es2022",
    minify: "esbuild",
    cssMinify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["lucide-react"],
        }
      }
    },
    chunkSizeWarningLimit: 400
  }
});

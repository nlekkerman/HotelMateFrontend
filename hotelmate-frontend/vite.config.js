import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  assetsInclude: ["**/*.lottie"],
  server: {
    // 🔧 Disable HTTPS for local development
    proxy: {
      "/api": "http://localhost:8000",
      
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // 🔧 Increase chunk warning threshold from 500kB to 1000kB
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          bootstrap: ["bootstrap"],
          datepicker: ["react-datepicker"],
        },
      },
    },
  },
});

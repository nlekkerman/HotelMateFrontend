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
    proxy: {
      "/api": "http://localhost:8000",
      "/ws": {
        target: "http://localhost:8000",
        ws: true,
        changeOrigin: true,
      },
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

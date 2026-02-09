import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev mode proxy:
//   /api/v1/...  -> http://localhost:8080/v1/...
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});

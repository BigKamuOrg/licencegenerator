import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5071,
      proxy: {
        "/api": {
          target: "http://213.14.81.2:5070",
          changeOrigin: true
        }
      }
  }
});



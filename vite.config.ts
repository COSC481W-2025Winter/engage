import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "vite-plugin-fs";

if (process.env.VITE_HMR_OVERLAY === undefined) {
  process.env.VITE_HMR_OVERLAY = "true";
}

export default defineConfig({
  plugins: [react(), fs()],
  base: "./",
  root: "./",
  server: {
    allowedHosts: ["ngage.lol", "localhost", "upload.ngage.lol", "login.ngage.lol"],
    hmr: {
      overlay: process.env.VITE_HMR_OVERLAY === "true"
    }
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: "./index.html",
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.startsWith("media/")) {
            return ""; // Prevent /media from being included
          }
          return assetInfo.name!;
        }
      }
    },
  },
});

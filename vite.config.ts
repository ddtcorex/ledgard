import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const apiProxyTarget = process.env.LEDGARD_API_PROXY_TARGET ?? "http://127.0.0.1:8787";
const allowedHosts = (process.env.LEDGARD_ALLOWED_HOSTS ?? "ledgard.test")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  cacheDir: ".vite-cache",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Ledgard",
        short_name: "Ledgard",
        description: "Single-ledger family expense tracker",
        lang: "vi",
        theme_color: "#003441",
        background_color: "#f9f9fa",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    allowedHosts,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist/client",
    sourcemap: true
  }
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "아산시공무원노동조합 차량 렌트사업",
        short_name: "차량 렌트예약",
        description: "아산시공무원노동조합 조합원 차량 렌트 예약 및 이용현황",
        lang: "ko",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f3f4f6",
        theme_color: "#123f4a",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // 예약현황은 실시간 폴링으로 최신 상태를 반영해야 하므로 API 응답을 캐시하지 않는다.
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5190,
    proxy: {
      "/api": {
        target: "http://localhost:4200",
        changeOrigin: true,
      },
    },
  },
});

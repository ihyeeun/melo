import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // 토큰이 있는 빌드(Vercel)에서만 소스맵을 만들어 올리고, 배포 결과물에는 남기지 않는다
    sentryVitePlugin({
      org: "melo-46",
      project: "melo-web",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      // 기본값은 업로드 실패 시 빌드를 멈춘다. 배포는 계속하고 경고만 남긴다
      errorHandler: (error) => {
        console.warn("[sentry] 소스맵 업로드 실패", error);
      },
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
      },
    }),
  ],
});

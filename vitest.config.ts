import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: false,
    include: ["src/app/__tests__/**/*.test.{ts,tsx}"],
    testTimeout: 10000,

    environment: "jsdom",

    setupFiles: ["src/app/__tests__/setup.ts"],

    // junit 报告输出至 CI 上传的 artifact 目录（.github/workflows/ci.yml）
    reporters: ["default", "junit"],
    outputFile: { junit: "test-results/junit.xml" },

    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "src/app/lib/**/*.ts",
        "src/app/hooks/**/*.ts",
        "src/app/components/**/*.tsx",
      ],
      exclude: [
        "src/app/components/ui/**",
        "src/app/components/figma/**",
        "src/app/docs/**",
        "src/app/__tests__/**",
      ],
      // 覆盖率棘轮（落档 72 上调）：2026-10-10 基线 45/44/31/44 →
      // 2026-11-23 实测 54.31/41.93/56.11/55.23（七连批 65~71 附带测试补齐），
      // 取整下限设防防回退；后续逐步上调至目标 80/70/80/80。
      thresholds: {
        lines: 55,
        functions: 56,
        branches: 41,
        statements: 54,
      },
    },
  },
});

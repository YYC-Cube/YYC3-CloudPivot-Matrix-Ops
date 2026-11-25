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
      // 覆盖率棘轮（落档 76 微收紧）：45/44/31/44（2026-10-10）→ 55/56/41/54
      // （2026-11-23）→ 55/56/42/54（2026-11-24）→ 55/56/42/54.5（2026-11-26，
      // 实测 54.78/42.53/56.31/55.71）；目标 80/70/80/80 逐档逼近。
      thresholds: {
        lines: 55,
        functions: 56,
        branches: 42,
        statements: 54.5,
      },
    },
  },
});

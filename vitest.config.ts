import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "src/backend/modules/**/*.ts",
        "src/backend/services/auth-session-service.ts",
        "src/backend/services/collector-session-codec.ts",
        "src/backend/services/tenant-data-service.ts",
        "src/backend/services/payment-recording-service.ts",
      ],
      exclude: ["**/__tests__/**", "**/*.test.ts", "**/*.d.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
        "src/backend/services/{auth-session-service,collector-session-codec,tenant-data-service,payment-recording-service}.ts": {
          lines: 90,
          functions: 90,
          statements: 90,
          branches: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
});

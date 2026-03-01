import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "packages/shared/src/**",
        "packages/connectors/src/**",
        "packages/jobs/src/**",
      ],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});

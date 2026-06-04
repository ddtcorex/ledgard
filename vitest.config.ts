import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.wrangler/**", "**/tests/e2e/**"],
    environment: "jsdom",
    globals: true
  }
});

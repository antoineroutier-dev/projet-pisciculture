import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  // Bound simulation-heavy workers in shared cloud and CI environments.
  test: { include: ["src/**/*.test.{ts,tsx}"], maxWorkers: 2 },
});

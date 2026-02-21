import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: true, // bind to 0.0.0.0 so devcontainer port-forwarding works
    port: 5173,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    // alias: {
    //   '@': resolve(__dirname, 'src'),
    // },
    tsconfigPaths: true,
  },
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.json",
      rollupTypes: true,
      include: ["src"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      name: "I18nextReactViteAutoTypes",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: [],
      output: {
        exports: "named",
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec}.ts", "src/index.ts"],
    },
  },
});

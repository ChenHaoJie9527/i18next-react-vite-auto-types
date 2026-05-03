import dts from "unplugin-dts/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.json",
      include: ["src"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      entryRoot: "src",
      bundleTypes: true,
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
    lib: {
      entry: {
        index: "src/index.ts", // plugin 主入口
        core: "src/core/index.ts", // core 主入口
        cli: "src/cli/index.ts", // cli 主入口
      },
      fileName: (format, entryName) => {
        const ext = format === "es" ? "js" : "cjs";
        return entryName === "index"
          ? `index.${ext}`
          : `${entryName}/index.${ext}`;
      },
      formats: ["es", "cjs"],
    },
    // 外部依赖
    rollupOptions: {
      // 显式声明外部依赖，避免打包
      external: [
        "vite",
        "i18next",
        "react-i18next",
        "node:fs",
        "node:path",
        "node:child_process",
        /^node:.*/,
        "@clack/prompts",
        "picocolors",
        "chokidar",
        "i18next-resources-to-backend",
      ],
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

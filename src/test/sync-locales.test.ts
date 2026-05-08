import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncLocales } from "../core/sync-locales";
import type { ResolvedConfig } from "../core/types";

describe("syncLocales", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  function createConfig(): ResolvedConfig {
    root = join(tmpdir(), `sync-locales-${Date.now()}`);

    return {
      contractsDir: join(root, "contracts"),
      framework: "vite",
      i18nDir: join(root, "i18n"),
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      outDir: join(root, "out"),
      root,
    };
  }
  it("新增时 同步对应的 locale 文件", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "user-management.ts");
    const result = syncLocales(config, { type: "add", file: baseFile });
    expect(result.writtenFiles).toHaveLength(2);
    expect(result).toEqual({
      writtenFiles: [
        join(config.i18nDir, "en-US", "user-management.ts"),
        join(config.i18nDir, "zh-CN", "user-management.ts"),
      ],
      deletedFiles: [],
      renamedFiles: [],
    });
  });
  it("修改时 同步对应的 locale 文件", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "user-management.ts");
    const expectedFiles = [
      join(config.i18nDir, "en-US", "user-management.ts"),
      join(config.i18nDir, "zh-CN", "user-management.ts"),
    ];
    const expectedContent = `import type { UserManagementMessage } from "../base/user-management";

export default {} satisfies UserManagementMessage;
`;
    mkdirSync(dirname(baseFile), { recursive: true });

    writeFileSync(baseFile, expectedContent);
    const result = syncLocales(config, {
      type: "change",
      file: baseFile,
    });
    expect(result.writtenFiles).toHaveLength(2);
    expect(result).toEqual({
      writtenFiles: expectedFiles,
      deletedFiles: [],
      renamedFiles: [],
    });

    for (const file of expectedFiles) {
      expect(readFileSync(file, "utf-8")).toBe(expectedContent);
    }
  });
});

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  it("删除时 删除对应的 locale 文件", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "user-management.ts");
    const expectedFiles = [
      join(config.i18nDir, "en-US", "user-management.ts"),
      join(config.i18nDir, "zh-CN", "user-management.ts"),
    ];

    for (const file of expectedFiles) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, "export default {};");
    }

    const result = syncLocales(config, { type: "unlink", file: baseFile });

    expect(result).toEqual({
      writtenFiles: [],
      deletedFiles: expectedFiles,
      renamedFiles: [],
    });
    for (const file of expectedFiles) {
      expect(existsSync(file)).toBe(false);
    }
  });

  it("重命名时 同步对应的 locale 文件", () => {
    const config = createConfig();
    const oldFile = join(config.contractsDir, "base", "user.ts");
    const newFile = join(config.contractsDir, "base", "user-management.ts");

    const expectedRenamedFiles = config.locales.map((locale) => ({
      from: join(config.i18nDir, locale, "user.ts"),
      to: join(config.i18nDir, locale, "user-management.ts"),
    }));

    // 创建旧文件
    for (const { from } of expectedRenamedFiles) {
      mkdirSync(dirname(from), { recursive: true });
      writeFileSync(from, "export default {};");
    }

    // 将 base 目录下的 user.ts 重命名为 user-management.ts
    const result = syncLocales(config, { type: "rename", oldFile, newFile });
    console.log("result =>", result);
    expect(result).toEqual({
      writtenFiles: [],
      deletedFiles: [],
      renamedFiles: expectedRenamedFiles,
    });
    for (const { from, to } of expectedRenamedFiles) {
      expect(existsSync(from)).toBe(false);
      expect(existsSync(to)).toBe(true);
    }
  });
});

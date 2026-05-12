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
import { syncAllBaseFiles } from "../lib/sync-all-base-files";

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

  it("syncs an added base file into each locale", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "user-management.ts");
    const result = syncLocales(config, { type: "add", file: baseFile });

    expect(result).toEqual({
      writtenFiles: [
        join(config.i18nDir, "en-US", "user-management.ts"),
        join(config.i18nDir, "zh-CN", "user-management.ts"),
      ],
      deletedFiles: [],
      renamedFiles: [],
    });
  });

  it("syncs a changed base file into each locale", () => {
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

    expect(result).toEqual({
      writtenFiles: expectedFiles,
      deletedFiles: [],
      renamedFiles: [],
    });

    for (const file of expectedFiles) {
      expect(readFileSync(file, "utf-8")).toBe(expectedContent);
    }
  });

  it("deletes locale files when the base file is unlinked", () => {
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

  it("renames matching locale files when the base file is renamed", () => {
    const config = createConfig();
    const oldFile = join(config.contractsDir, "base", "user.ts");
    const newFile = join(config.contractsDir, "base", "user-management.ts");

    const expectedRenamedFiles = config.locales.map((locale) => ({
      from: join(config.i18nDir, locale, "user.ts"),
      to: join(config.i18nDir, locale, "user-management.ts"),
    }));

    for (const { from } of expectedRenamedFiles) {
      mkdirSync(dirname(from), { recursive: true });
      writeFileSync(from, "export default {};");
    }

    const result = syncLocales(config, { type: "rename", oldFile, newFile });

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

  it("syncs every base file into each locale", () => {
    const config = createConfig();
    const baseFiles = [
      join(config.contractsDir, "common.ts"),
      join(config.contractsDir, "user-management.ts"),
    ];
    const expectedFiles = [
      join(config.i18nDir, "en-US", "common.ts"),
      join(config.i18nDir, "zh-CN", "common.ts"),
      join(config.i18nDir, "en-US", "user-management.ts"),
      join(config.i18nDir, "zh-CN", "user-management.ts"),
    ];

    for (const file of baseFiles) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, "export type Message = {};");
    }

    const result = syncAllBaseFiles(config);

    expect(result).toEqual({ writtenFiles: expectedFiles });
    for (const file of expectedFiles) {
      expect(existsSync(file)).toBe(true);
    }
  });
});

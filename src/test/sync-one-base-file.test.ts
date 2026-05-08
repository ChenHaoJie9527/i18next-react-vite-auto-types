import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../core/types";
import { syncOneBaseFile } from "../lib/sync-one-base-file";

describe("syncOneBaseFile", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  function createConfig(): ResolvedConfig {
    root = join(tmpdir(), `sync-one-base-file-${Date.now()}`);

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

  it("在新增或者修改时 同步对应的 locale 文件", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "user-management.ts");
    const expectedFiles = [
      join(config.i18nDir, "en-US", "user-management.ts"),
      join(config.i18nDir, "zh-CN", "user-management.ts"),
    ];
    const expectedContent = `import type { UserManagementMessage } from "../base/user-management";

export default {} satisfies UserManagementMessage;
`;

    const result = syncOneBaseFile(config, baseFile);

    expect(result).toEqual(expectedFiles);

    for (const file of expectedFiles) {
      expect(readFileSync(file, "utf-8")).toBe(expectedContent);
    }
  });

  it("内容未变化时不重复写入", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "common.ts");

    syncOneBaseFile(config, baseFile);

    expect(syncOneBaseFile(config, baseFile)).toEqual([]);
  });

  it("非普通 ts 文件不生成 locale 文件", () => {
    const config = createConfig();

    const notValidFile = join(config.contractsDir, "base", "types.d.ts");
    const result = syncOneBaseFile(config, notValidFile);
    expect(result).toBeUndefined();
    expect(existsSync(config.i18nDir)).toBe(false);
  });
});

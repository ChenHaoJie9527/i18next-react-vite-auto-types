import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanContracts } from "../../dist/core/index.cjs";

/**
 * @description 创建一个临时目录
 * @returns - 返回临时目录的路径
 * @description node:fs 模块的 mkdtempSync 方法用于创建一个临时目录。
 */
function makeTmpDir() {
  const dir = mkdtempSync(join(tmpdir(), "i18next-kit-test-"));
  return dir;
}

describe("scanContracts", () => {
  it("返回目录下的 .ts 文件名，忽略 .d.ts 文件", () => {
    // 创建一个临时目录
    const dir = makeTmpDir();
    // 创建 一些干扰文件
    writeFileSync(join(dir, "common.ts"), "");
    writeFileSync(join(dir, "common.d.ts"), "");
    writeFileSync(join(dir, "file.ts"), "");
    writeFileSync(join(dir, "app.css"), "");
    writeFileSync(join(dir, "user-management.ts"), "");

    // 扫描临时目录里的所有文件
    const result = scanContracts(dir);
    expect(result).toEqual(
      expect.arrayContaining([
        {
          name: "common",
          typeName: "CommonMessage",
        },
        {
          name: "file",
          typeName: "FileMessage",
        },
        {
          name: "user-management",
          typeName: "UserManagementMessage",
        },
      ])
    );
    expect(result).toHaveLength(3);
  });
  it("kebab-case 命名会正确 Pascal 化", () => {
    const dir = makeTmpDir();
    // 创建一个 user-management.ts 文件
    writeFileSync(join(dir, "user-management.ts"), "");

    const result = scanContracts(dir);
    expect(result).toEqual(
      expect.arrayContaining([
        {
          name: "user-management",
          typeName: "UserManagementMessage",
        },
      ])
    );
  });
});

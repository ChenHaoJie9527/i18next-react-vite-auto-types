import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeIfChanged } from "../core/write";

/**
 *
 * @returns - 返回临时目录的路径
 */
function makeTmpDir() {
  // 路径形如 /tmp/i18next-kit-write-test-1234567890/
  return mkdtempSync(join(tmpdir(), "i18next-kit-write-test-"));
}

describe("writeIfChanged", () => {
  let lastDir: string | undefined;

  // 每次测试结束后清理临时目录
  afterEach(() => {
    if (lastDir) {
      // rmSync 删除目录，recursive: true 表示删除目录及其子目录，force: true 表示删除目录时忽略错误
      rmSync(lastDir, { recursive: true, force: true });
      lastDir = undefined;
    }
  });

  it("新文件或内容变化时返回 true，并写入目标内容", () => {
    const dir = makeTmpDir();
    // 记录临时目录
    lastDir = dir;
    // 路径形如 /tmp/i18next-kit-write-test-1234567890/out.txt
    const p = join(dir, "out.txt");

    expect(writeIfChanged(p, "a123")).toBe(true);
    expect(readFileSync(p, "utf-8")).toBe("a123");
    expect(existsSync(`${p}.tmp`)).toBe(false);

    expect(writeIfChanged(p, "b")).toBe(true);
    expect(readFileSync(p, "utf-8")).toBe("b");
    expect(existsSync(`${p}.tmp`)).toBe(false);
  });

  it("内容与磁盘一致时返回 false，且不重复写入", () => {
    const dir = makeTmpDir();
    lastDir = dir;
    const p = join(dir, "out.txt");
    writeFileSync(p, "x", "utf-8");
    const before = readFileSync(p, "utf-8");

    expect(writeIfChanged(p, "x")).toBe(false);
    expect(readFileSync(p, "utf-8")).toBe(before);
  });
});

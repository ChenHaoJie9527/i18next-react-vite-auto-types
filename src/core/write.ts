import { readFileSync, renameSync, writeFileSync } from "node:fs";

/**
 * @description 检测文件是否发生变化，如果发生变化则写入文件
 * @param path - 文件路径
 * @param content - 文件内容
 * @returns - 是否写入成功
 * @example
 * ```ts
 * import { writeIfChanged } from "./write-if-change";
 * writeIfChanged("test.txt", "Hello, world!");
 * // true
 * writeIfChanged("test.txt", "Hello, world!");
 * // false
 * ```
 */
export function writeIfChanged(path: string, content: string) {
  try {
    if (readFileSync(path, "utf-8") === content) {
      return false;
    }
  } catch {
    // noop
  }
  return writeFileAtomic(path, content);
}

/**
 * @description 原子性写入文件，使用 `.tmp` 文件临时存储，然后重命名
 * @param path - 文件路径
 * @param content - 文件内容
 * @returns - 是否写入成功
 * @example
 * ```ts
 * import { writeFileAtomic } from "./write";
 * writeFileAtomic("test.txt", "Hello, world!");
 * // true
 * writeFileAtomic("test.txt", "Hello, world!");
 * // false
 * ```
 * @returns
 */
function writeFileAtomic(path: string, content: string) {
  const tem = `${path}.tmp`;
  writeFileSync(tem, content, "utf-8");
  renameSync(tem, path);
  return true;
}

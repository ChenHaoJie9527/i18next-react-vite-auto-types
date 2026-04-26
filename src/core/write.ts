import { readFileSync, writeFileSync } from "node:fs";

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
  writeFileSync(path, content, "utf-8");
  return true;
}

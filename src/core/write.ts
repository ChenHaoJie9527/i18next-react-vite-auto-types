import { readFileSync, renameSync, writeFileSync } from "node:fs";

/**
 * Write a file only when its content has changed.
 *
 * @param path - Target file path.
 * @param content - Content to write.
 * @returns `true` when the file was written, or `false` when content was unchanged.
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
 * Write a file atomically through a temporary `.tmp` file.
 *
 * @param path - Target file path.
 * @param content - Content to write.
 * @returns `true` after the file is written.
 * @example
 * ```ts
 * import { writeFileAtomic } from "./write";
 * writeFileAtomic("test.txt", "Hello, world!");
 * // true
 * writeFileAtomic("test.txt", "Hello, world!");
 * // false
 * ```
 */
function writeFileAtomic(path: string, content: string) {
  const tem = `${path}.tmp`;
  writeFileSync(tem, content, "utf-8");
  renameSync(tem, path);
  return true;
}

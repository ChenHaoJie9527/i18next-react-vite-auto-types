import { basename, extname } from "node:path";
import { toPascalCase } from "./to-pascal-case";

/**
 * 获取 base 文件的命名空间和类型名称
 * @param file - 文件路径
 * @returns 文件的命名空间和类型名称
 * @example
 * ```ts
 * getBaseFileMetadata("user-management.ts") => {
 *   namespace: "user-management",
 *   typeName: "UserManagementMessage",
 * }
 * ```
 */
export function getBaseFileMetadata(file: string) {
  if (extname(file) !== ".ts" || file.endsWith(".d.ts")) {
    return;
  }

  const namespace = basename(file, ".ts");

  return {
    namespace,
    typeName: `${toPascalCase(namespace)}Message`,
  };
}

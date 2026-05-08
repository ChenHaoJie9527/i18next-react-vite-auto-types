/**
 * 将 kebab-case 转换为 PascalCase
 * @param name - 需要转换的字符串
 * @returns 转换后的字符串
 * @example
 * ```ts
 * toPascalCase("user-management") => "UserManagement"
 * ```
 */
export function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

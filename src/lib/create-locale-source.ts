/**
 * 创建 locale 文件内容, 将 namespace 和 typeName 转换为对应的 import 和 export
 * @param namespace - 命名空间
 * @param typeName - 类型名称
 * @returns 创建的 locale 文件内容
 */
export function createLocaleSource(
  namespace: string,
  typeName: string,
  defaultValue: Record<string, string> = {}
): string {
  const entries = Object.entries(defaultValue);
  const defaultSource =
    entries.length === 0
      ? "{}"
      : `{
${entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join("\n")}
}`;

  return `import type { ${typeName} } from "../base/${namespace}";

export default ${defaultSource} satisfies ${typeName};
`;
}

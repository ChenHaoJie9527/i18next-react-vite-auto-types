interface Namespace {
  name: string;
  typeName: string;
}

/**
 * @description 该函数会返回一段合法的 TypeScript 代码，表示 defaultNS 的值
 * @param namespaces - 命名空间列表
 * @example
 * ```ts
 * const namespaces = [
 *   { name: 'common', typeName: 'CommonMessage' },
 *   { name: 'user-management', typeName: 'UserManagementMessage' },
 * ];
 * emitResoureces(namespaces);
 * ```
 * @returns - 返回一个字符串，表示 defaultNS 的值
 */
export function emitResoureces(namespaces: Namespace[]) {
  // 新增 resourceNamespaces 对象
  const entries = namespaces
    .map((ns) => ` ${ns.name}: {} as ${ns.typeName}`)
    .join("\n");

  //   console.log("entries:", entries);

  const body = `export const resourceNamespaces = {
    ${entries}
  } as const;`;

  //   console.log("body:", body);

  // 拼 import 语句列表
  const imports = namespaces
    .map((ns) => `import type ${ns.typeName} from "../base/${ns.name}"`)
    .join("\n");
  return `${imports}\n\nexport const defaultNS = 'common' as const;\n\n${body}\n`;
}

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
    .map((ns) => ` ${formatKey(ns.name)}: {} as ${ns.typeName}`)
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

/**
 * @description 该函数会返回一个合法的 JS 标识符，如果 name 是合法的 JS 标识符，则返回 name，否则返回 name 加上引号
 * @param name - 需要格式化的字符串
 * @example
 * ```ts
 * formatKey("user-management"); // "user-management"
 * formatKey("user management"); // "'user management'"
 * ```
 * @returns - 返回一个合法的 JS 标识符
 */
function formatKey(name: string) {
  const REGEX = /^[a-zA-Z_$][\w$]*$/; // 正则表达式，表示合法的 JS 标识符
  return REGEX.test(name) ? name : `'${name}'`;
}

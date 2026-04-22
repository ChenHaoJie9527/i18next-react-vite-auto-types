/**
 * @description 该函数会返回一段合法的 TypeScript 代码，表示 defaultNS 的值
 * @returns - 返回一个字符串，表示 defaultNS 的值
 */
export function emitResoureces() {
  return `export const defaultNS = 'common' as const;\n`;
}

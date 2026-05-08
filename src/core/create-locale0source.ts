/**
 * 创建 locale 文件内容, 将 namespace 和 typeName 转换为对应的 import 和 export
 * @param namespace - 命名空间
 * @param typeName - 类型名称
 * @returns 创建的 locale 文件内容
 */
export function createLocaleSource(namespace: string, typeName: string): string {
  return `import type ${typeName} from "../base/${namespace}";    

export default {} satisfies ${typeName};`;
}
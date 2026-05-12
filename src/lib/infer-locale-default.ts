export type LocaleDefaultValue = Record<string, string>;

/**
 * 推断 locale 的默认值
 * @param source - 源代码
 * @param typeName - 类型名称
 * @returns - locale 的默认值
 * @example
 * ```ts
 * inferLocaleDefaultValue("type UserMessage = { name: string; age: number; };", "UserMessage") => { name: "", age: "" }
 * ```
 */
export function inferLocaleDefaultValue(
  source: string,
  typeName: string
): LocaleDefaultValue {
  const body = findTypeLiteralBody(source, typeName);
  if (!body) {
    return {};
  }

  const result: LocaleDefaultValue = {};
  for (const key of findRequiredStringKeys(body)) {
    result[key] = "";
  }
  return result;
}

/**
 * 查找类型字面量体
 * @param source - 源代码
 * @param typeName - 类型名称
 * @returns - 类型字面量体
 * @example
 * ```ts
 * findTypeLiteralBody("type UserMessage = { name: string; age: number; };", "UserMessage") => "{ name: string; age: number; }"
 * ```
 */
function findTypeLiteralBody(source: string, typeName: string) {
  const typeStart = source.indexOf(`type ${typeName}`);
  if (typeStart < 0) {
    return;
  }

  const open = source.indexOf("{", typeStart);
  if (open < 0) {
    return;
  }

  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(open + 1, index);
      }
    }
  }

  return;
}

/**
 * 查找必需的字符串键
 * @param body - 类型字面量体
 * @returns - 必需的字符串键
 * @example
 * ```ts
 * findRequiredStringKeys("{ name: string; age: number; }") => ["name", "age"]
 * ```
 */
function findRequiredStringKeys(body: string) {
  const keys: string[] = [];
  const propertyPattern =
    /(?:^|[;\n])\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$-]*))\s*:\s*string\s*(?:;|,|\n|$)/g;

  for (const match of body.matchAll(propertyPattern)) {
    const key = match[1] ?? match[2] ?? match[3];
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}

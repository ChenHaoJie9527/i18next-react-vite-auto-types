/**
 * 根据 i18n 类型声明推断 locale 文件中应该包含的默认字符串。
 * 主要用于脚手架或 watch 模式生成缺失翻译键时，自动填充插值和富文本占位符。
 */
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
  for (const property of findRequiredMessageProperties(body)) {
    const interpolation = createInterpolationPlaceholder(property.typeRef);
    result[property.key] =
      property.kind === "rich"
        ? createRichPlaceholder(property.typeRef, interpolation)
        : interpolation;
  }
  return result;
}

export function mergeLocaleDefaultValue(
  inferred: LocaleDefaultValue,
  existingSource: string
): LocaleDefaultValue {
  // 只合并当前类型仍然存在的 key，避免保留已经从类型声明中删除的旧文案。
  const existing = parseLocaleDefaultValue(existingSource);
  const result: LocaleDefaultValue = {};

  for (const key of Object.keys(inferred)) {
    result[key] = existing[key] ?? inferred[key] ?? "";
  }

  return result;
}

export function parseLocaleDefaultValue(source: string): LocaleDefaultValue {
  const body = findDefaultObjectBody(source);
  if (!body) {
    return {};
  }

  const result: LocaleDefaultValue = {};
  const propertyPattern =
    /(?:^|[,\n])\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$-]*))\s*:\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')\s*(?:,|\n|$)/g;

  for (const match of body.matchAll(propertyPattern)) {
    const key = match[1] ?? match[2] ?? match[3];
    const value = match[4] ?? match[5];
    if (key && value !== undefined) {
      result[key] = unescapeStringValue(value);
    }
  }

  return result;
}

/**
 * 提取 `export default { ... }` 的对象体，用于读取已有 locale 文件内容。
 */
function findDefaultObjectBody(source: string) {
  const defaultStart = source.indexOf("export default");
  if (defaultStart < 0) {
    return;
  }

  const open = source.indexOf("{", defaultStart);
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
 * 还原 locale 字符串字面量中被转义的引号。
 */
function unescapeStringValue(value: string) {
  return value.replaceAll('\\"', '"').replaceAll("\\'", "'");
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
 * findRequiredMessageProperties("{ name: string; rich: I18nRich; }") => [{ key: "name", kind: "text" }, { key: "rich", kind: "rich" }]
 * ```
 */
function findRequiredMessageProperties(body: string): Array<{
  key: string;
  kind: "text" | "rich";
  typeRef: string;
}> {
  const properties: Array<{
    key: string;
    kind: "text" | "rich";
    typeRef: string;
  }> = [];
  const propertyStartPattern =
    /(?:^|[;\n])\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$-]*))\s*:\s*/g;

  for (const match of body.matchAll(propertyStartPattern)) {
    const key = match[1] ?? match[2] ?? match[3];
    if (!key || match.index === undefined) {
      continue;
    }
    const typeStart = match.index + match[0].length;
    const typeRef = readTypeReference(body, typeStart);
    if (isSupportedTextType(typeRef)) {
      properties.push({ key, kind: "text", typeRef });
      continue;
    }
    if (isSupportedRichType(typeRef)) {
      properties.push({ key, kind: "rich", typeRef });
    }
  }
  return properties;
}

function readTypeReference(body: string, start: number) {
  let angleDepth = 0;
  let braceDepth = 0;
  for (let index = start; index < body.length; index += 1) {
    const char = body[index];
    if (char === "<") {
      angleDepth += 1;
      continue;
    }
    if (char === ">") {
      angleDepth -= 1;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth -= 1;
      continue;
    }
    if (
      (char === ";" || char === "," || char === "\n") &&
      angleDepth === 0 &&
      braceDepth === 0
    ) {
      return body.slice(start, index).trim();
    }
  }

  return body.slice(start).trim();
}

/**
 * 判断字段类型是否是支持自动生成插值占位符的文本消息类型。
 */
function isSupportedTextType(typeRef: string) {
  return /^(string|I18nText|TextMessage)(?:\s*<[\s\S]+>)?$/.test(typeRef);
}

/**
 * 判断字段类型是否是支持自动生成组件标签占位符的富文本消息类型。
 */
function isSupportedRichType(typeRef: string) {
  return /^(I18nRich|RichMessage)(?:\s*<[\s\S]+>)?$/.test(typeRef);
}

/**
 * 根据 `I18nRich<Values, Components>` 的第二个泛型参数生成富文本组件占位符。
 */
function createRichPlaceholder(typeRef: string, content: string) {
  const componentsArg = readSecondTypeArgument(typeRef);
  const componentNames = componentsArg ? findObjectKeys(componentsArg) : [];
  if (componentNames.length === 0) {
    return content;
  }

  const [firstName, ...restNames] = componentNames;
  if (!firstName) {
    return content;
  }

  return [
    `<${firstName}>${content}</${firstName}>`,
    ...restNames.map((name) => `<${name}></${name}>`),
  ].join("");
}

/**
 * 根据 `I18nText<Values>` 或 `I18nRich<Values, Components>` 的第一个泛型参数生成插值占位符。
 */
function createInterpolationPlaceholder(typeRef: string) {
  const valuesArg = readFirstTypeArgument(typeRef);
  const valueNames = valuesArg ? findObjectKeys(valuesArg) : [];
  return valueNames.map((name) => `{{${name}}}`).join("");
}

/**
 * 读取消息类型的第一个泛型参数，也就是插值变量表。
 */
function readFirstTypeArgument(typeRef: string) {
  const open = typeRef.indexOf("<");
  const close = typeRef.lastIndexOf(">");
  if (open < 0 || close < open) {
    return;
  }

  const args = splitTopLevel(typeRef.slice(open + 1, close));
  return args[0]?.trim();
}

/**
 * 读取富文本消息类型的第二个泛型参数，也就是组件表。
 */
function readSecondTypeArgument(typeRef: string) {
  const open = typeRef.indexOf("<");
  const close = typeRef.lastIndexOf(">");
  if (open < 0 || close < open) {
    return;
  }

  const args = splitTopLevel(typeRef.slice(open + 1, close));
  return args[1]?.trim();
}

/**
 * 按顶层逗号拆分泛型参数，忽略嵌套泛型和对象字面量内部的逗号。
 */
function splitTopLevel(source: string) {
  const result: string[] = [];
  let start = 0;
  let angleDepth = 0;
  let braceDepth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "<") {
      angleDepth += 1;
      continue;
    }
    if (char === ">") {
      angleDepth -= 1;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth -= 1;
      continue;
    }
    if (char === "," && angleDepth === 0 && braceDepth === 0) {
      result.push(source.slice(start, index));
      start = index + 1;
    }
  }
  result.push(source.slice(start));
  return result;
}

/**
 * 从对象类型字面量中提取属性名，用于生成对应的插值或组件占位符。
 */
function findObjectKeys(source: string) {
  const body = source.trim().replace(/^\{/, "").replace(/\}$/, "");
  const keys: string[] = [];
  const keyPattern =
    /(?:^|[;\n,])\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$-]*))\s*[?:]?\s*:/g;

  for (const match of body.matchAll(keyPattern)) {
    const key = match[1] ?? match[2] ?? match[3];
    if (key) {
      keys.push(key);
    }
  }

  return keys;
}

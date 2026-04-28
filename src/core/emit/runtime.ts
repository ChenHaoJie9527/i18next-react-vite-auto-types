export function emitRuntime(locales: string[]) {
  const globPattern = createGlobPattern(locales);
  // initialResources: 'en-US': {}, 'zh-CN': {}
  const initialResources = createAlternation(locales);
  return globPattern;
}

/**
 * @description 创建 glob 模式
 * @param locales - 语言列表
 * @returns - 返回一个字符串，表示 glob 模式
 * @example
 * ```ts
 * createGlobPattern(["en-US", "zh-CN"]) => "./{en-US,zh-CN}/*.ts"
 * ```
 */
export function createGlobPattern(locales: string[]) {
  return `./{${locales.join(",")}}/*.ts`;
}

/**
 * @description 创建 alternation
 * @param locales - 语言列表
 * @returns - 返回一个字符串，表示 alternation
 * @example
 * ```ts
 * createAlternation(["en-US", "zh-CN"]) => "en-US|zh-CN"
 * ```
 */
export function createAlternation(locales: string[]) {
  return locales.join("|");
}

/**
 * @description 创建 initialResources: 'en-US': {}, 'zh-CN': {}
 * @param locales - 语言列表
 * @returns - 返回一个字符串，表示 initialResources
 * @example
 * ```ts
 * createInitialResources(["en-US", "zh-CN"]) => "'en-US': {}, 'zh-CN': {}"
 * ```
 */
export function createInitialResources(locales: string[]) {
  return locales.map((locale) => `'${locale}': {}`).join(", ");
}

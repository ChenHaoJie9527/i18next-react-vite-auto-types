import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * @description 扫描国际化目录，返回语言列表
 * @param i18nDir - 国际化目录
 * @param locales - 语言列表
 * @returns - 返回语言列表和命名空间列表
 */
export function scanLocalesFolder(i18nDir: string, locales: string[]) {
  const result: { locale: string; namespace: string }[] = [];
  for (const locale of locales) {
    // 拼接语言目录：./i18n/en-US or ./i18n/zh-CN or ./i18n/zh-HK
    const dir = join(i18nDir, locale);
    const files = readdirSync(dir, "utf-8")
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
      .map((f) => f.replace(/\.ts$/, ""));
    // for (const namespace of files) {
    //   result.push({ locale, namespace });
    // }

    result.push(...files.map((namespace) => ({ locale, namespace })));
  }

  return result;
}

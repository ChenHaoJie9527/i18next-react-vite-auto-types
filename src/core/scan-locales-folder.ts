import { readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Scan locale folders and return the namespace files found for each locale.
 *
 * @param i18nDir - Directory containing locale subdirectories.
 * @param locales - Locales to scan.
 * @returns Locale and namespace pairs discovered from `*.ts` files.
 */
export function scanLocalesFolder(i18nDir: string, locales: string[]) {
  const result: { locale: string; namespace: string }[] = [];
  for (const locale of locales) {
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

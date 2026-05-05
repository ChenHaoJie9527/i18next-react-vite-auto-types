import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type LocaleScanEntry = { locale: string; namespace: string };

export type ScanLocalesFolderResult = {
  files: LocaleScanEntry[];
  /** 配置的 locale 在 i18n 根目录下没有对应子目录 */
  missingLocaleDirs: string[];
};

/**
 * Scan locale folders and return the namespace files found for each locale.
 *
 * @param i18nDir - Directory containing locale subdirectories.
 * @param locales - Locales to scan.
 * @returns Discovered `*.ts` pairs and locales whose subdirectory is missing.
 */
export function scanLocalesFolder(
  i18nDir: string,
  locales: string[]
): ScanLocalesFolderResult {
  const files: LocaleScanEntry[] = [];
  const missingLocaleDirs: string[] = [];

  for (const locale of locales) {
    const dir = join(i18nDir, locale);
    if (!existsSync(dir)) {
      missingLocaleDirs.push(locale);
      continue;
    }

    const entries = readdirSync(dir, "utf-8")
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
      .map((f) => f.replace(/\.ts$/, ""));

    files.push(...entries.map((namespace) => ({ locale, namespace })));
  }

  return { files, missingLocaleDirs };
}

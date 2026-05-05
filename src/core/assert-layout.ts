import { existsSync } from "node:fs";
import type { ResolvedConfig } from "./types";
import { I18nextKitError } from "./types";

/**
 * 在扫描、生成前检查宿主是否具备 i18n 根目录与契约目录（默认 i18n/base）。
 * 与仅检查 contractsDir 相比，可区分「未建 src/i18n」与「已建 i18n 但未建 base」。
 */
export function assertResolvedI18nLayout(config: ResolvedConfig): void {
  if (!existsSync(config.i18nDir)) {
    throw new I18nextKitError(
      "I18N_DIR_NOT_FOUND",
      `i18n 根目录不存在：${config.i18nDir}。请先创建该目录（默认相对项目根为 src/i18n，可通过插件 options.i18nDir 修改）。`,
      { i18nDir: config.i18nDir }
    );
  }
  if (!existsSync(config.contractsDir)) {
    throw new I18nextKitError(
      "CONTRACTS_DIR_NOT_FOUND",
      `契约目录不存在：${config.contractsDir}。i18n 目录已在：${config.i18nDir}，请在其下创建 base（或配置 contractsDir 指向契约文件夹）。`,
      { contractsDir: config.contractsDir, i18nDir: config.i18nDir }
    );
  }
}

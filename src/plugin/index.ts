/**
 * Configuration for the `i18next-kit` Vite plugin.
 */
export interface Config {
  /**
   * Directory containing base contract files such as `common.ts`.
   */
  contractsDir?: string;
  /**
   * Override generated file names.
   */
  fileNames?: {
    /**
     * File name for generated resource namespace metadata.
     */
    resources?: string;
    /**
     * File name for generated locale contracts.
     */
    contracts?: string;
    /**
     * File name for generated runtime initialization code.
     */
    runtime?: string;
    /**
     * File name for generated i18next module augmentation.
     */
    dts?: string;
  };
  /**
   * Directory containing locale folders.
   */
  i18nDir?: string;
  /**
   * Whether to load resources lazily.
   */
  lazy?: boolean;
  /**
   * Locales to scan and generate resources for.
   *
   * @example
   * ```ts
   * ["en-US", "zh-CN"]
   * ```
   */
  locales: readonly string[];
  /**
   * Resource organization strategy.
   *
   * Use `"folder"` when translations are grouped by locale folder, or `"file"`
   * when translations are grouped by file.
   */
  mode: "folder" | "file";
  /**
   * Optional namespace name transform.
   */
  nameTransform?: "none" | "kebabToCamel";
  /**
   * Output directory for generated files.
   */
  outDir?: string;
  /**
   * Project root used to resolve relative paths.
   */
  root?: string;
}

/**
 * Create the `i18next-kit` Vite plugin.
 *
 * @param _config - Plugin configuration.
 * @returns A Vite-compatible plugin object.
 */
function i18nextKit(_config?: Config) {
  return {
    name: "i18next-kit",
  };
}

export { type Config as I18nextKitConfig, i18nextKit };

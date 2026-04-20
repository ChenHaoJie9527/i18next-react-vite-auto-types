export interface Config {
  contractsDir?: string;
  fileNames?: {
    resources?: string;
    contracts?: string;
    runtime?: string;
    dts?: string;
  };
  i18nDir?: string;
  lazy?: boolean;
  locales: readonly string[];
  mode: "folder" | "file";
  nameTransform?: "none" | "kebabToCamel";
  outDir?: string;
  root?: string;
}

/**
 * i18next-kit plugin
 * @returns {Object}
 * @property {string} name - The name of the plugin
 */
function i18nextKit(_config?: Config) {
  return {
    name: "i18next-kit",
  };
}

export { type Config as I18nextKitConfig, i18nextKit };

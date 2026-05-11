import { join } from "node:path";
import { syncAllBaseFiles } from "../lib/sync-all-base-files";
import { assertResolvedI18nLayout } from "./assert-layout";
import { emitContracts } from "./emit/contracts";
import { emitDts } from "./emit/dts";
import { emitResources } from "./emit/resources";
import { emitRuntime } from "./emit/runtime";
import { resolveConfig } from "./resolve-config";
import { prepareI18nScaffold } from "./scaffold";
import { scanContracts } from "./scan-contracts";
import { scanLocalesFolder } from "./scan-locales-folder";
import type { I18nextKitConfig } from "./types";
import { type ValidationReport, validate } from "./validate";
import { writeIfChanged } from "./write";

export type GenerateResult = {
  writtenFiles: string[];
  validation: ValidationReport;
  durationMs: number;
};
/**
 * 生成所有文件 - 这个函数主要用于测试和开发阶段，用于生成所有文件并验证其正确性
 * @param userConfig - 用户配置
 * @returns 生成结果
 */
export function generateAll(userConfig: I18nextKitConfig): GenerateResult {
  const start = performance.now();
  const skipLayoutAssert = userConfig.scaffold !== false;
  const input = skipLayoutAssert ? prepareI18nScaffold(userConfig) : userConfig;
  const config = resolveConfig(input);
  if (!skipLayoutAssert) {
    assertResolvedI18nLayout(config);
  }

  const syncResult = syncAllBaseFiles(config);
  const namespaces = scanContracts(config.contractsDir);
  const { files: localeFiles, missingLocaleDirs } = scanLocalesFolder(
    config.i18nDir,
    [...config.locales]
  );
  const validation = validate(
    namespaces,
    localeFiles,
    [...config.locales],
    missingLocaleDirs
  );

  const written: string[] = [...syncResult.writtenFiles];
  const artifacts: [string, string][] = [
    ["generated-resources.ts", emitResources(namespaces)],
    [
      "contracts.ts",
      emitContracts(namespaces, localeFiles, [...config.locales]),
    ],
    ["generated-runtime.ts", emitRuntime([...config.locales])],
    ["i18next.d.ts", emitDts()],
  ];

  for (const [file, content] of artifacts) {
    const full = join(config.outDir, file);
    if (writeIfChanged(full, content)) {
      written.push(full);
    }
  }

  return {
    writtenFiles: written,
    validation,
    durationMs: performance.now() - start,
  };
}

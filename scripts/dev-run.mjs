import { join } from "node:path";
import {
  emitContracts,
  emitDts,
  emitResources,
  emitRuntime,
  scanContracts,
  scanLocalesFolder,
  writeIfChanged,
} from "../dist/core/index.cjs";

const outDir = "./__tests__/fixtures/basic";
const locales = ["en-US", "zh-CN", "zh-HK"];
const localeFiles = scanLocalesFolder(outDir, locales);
const namespaces = scanContracts(join(outDir, "base"));

const artifacts = [
  ["generated-resources.ts", emitResources(namespaces)],
  ["contracts.ts", emitContracts(namespaces, localeFiles, locales)],
  ["generated-runtime.ts", emitRuntime(locales)],
  ["i18next.d.ts", emitDts()],
];

const artifactsMap = new Map(artifacts);

// 遍历 artifactsMap 并写入文件
for (const [file, content] of artifactsMap) {
  const changed = writeIfChanged(join(outDir, file), content);
  console.log(changed ? `✓ wrote ${file}` : `· skipped ${file}`);
}

import pc from "picocolors";
import { generateAll, I18nextKitError } from "../src/core";

try {
  const result = await generateAll({
    root: process.cwd(),
    i18nDir: "__tests__/fixtures/basic",
    outDir: "__tests__/fixtures/basic",
    locales: ["en-US", "zh-CN", "zh-HK"],
    mode: "folder",
    scaffold: false,
  });

  for (const file of result.writtenFiles) {
    console.log(pc.green(`✓ ${file}`));
  }
  for (const issue of result.validation.issues) {
    console.warn(
      pc.yellow(`⚠ [${issue.code}] ${issue.locale} × ${issue.namespace}`)
    );
  }

  console.log(pc.dim(`完成，用时 ${result.durationMs.toFixed(1)}ms`));
} catch (error) {
  if (error instanceof I18nextKitError) {
    console.error(pc.red(`✗ ${error.message}`));
    process.exit(1);
  }
  throw error;
}

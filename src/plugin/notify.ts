import type { ViteDevServer } from "vite";
import type { GenerateResult } from "../core/orchestrate";
import type { ValidationIssue, ValidationReport } from "../core/validate";

/**
 * 格式化校验问题列表
 * @param issues - 校验问题列表
 * @returns - 格式化后的校验问题列表
 */
function formatIssues(issues: ValidationIssue[]): string {
  return issues
    .map((i) => `  - ${i.code}: locale=${i.locale} namespace=${i.namespace}`)
    .join("\n");
}

/**
 * 日志生成结果
 * @param result - 生成结果
 */
export function logGenerateResult(result: GenerateResult) {
  if (result.writtenFiles.length === 0) {
    return;
  }
  console.info(
    `[i18next-kit] wrote ${result.writtenFiles.length} file(s) in ${Math.round(result.durationMs)}ms`
  );
  for (const f of result.writtenFiles) {
    console.info(`  ${f}`);
  }
}

/**
 * 日志校验报告
 * @param report - 校验报告
 */
export function logValidationReport(report: ValidationReport) {
  if (report.ok) {
    return;
  }
  console.warn("[i18next-kit] validation issues:");
  for (const line of formatIssues(report.issues).split("\n")) {
    console.warn(line);
  }
}

/**
 * 发送校验错误到 ws overlay
 * @param server - dev server
 * @param report - 校验报告
 */
export function sendValidationOverlay(
  server: ViteDevServer | undefined,
  report: ValidationReport
) {
  if (!server || report.ok) {
    return;
  }
  const message = `[i18next-kit] validation failed\n${formatIssues(report.issues)}`;
  server.ws.send({
    type: "error",
    err: {
      message,
      stack: "",
    },
  });
}

/**
 * 发送致命错误到 ws overlay
 * @param server - dev server
 * @param error - 错误
 */
export function sendFatalOverlay(
  server: ViteDevServer | undefined,
  error: unknown
) {
  if (!server) {
    return;
  }
  const err = error instanceof Error ? error : new Error(String(error));
  server.ws.send({
    type: "error",
    err: {
      message: err.message,
      stack: err.stack ?? "",
    },
  });
}

/**
 * 构建错误
 * @param report - 校验报告
 * @returns - 构建错误
 */
export function validationBuildError(report: ValidationReport) {
  return new Error(
    `[i18next-kit] validation failed:\n${formatIssues(report.issues)}`
  );
}

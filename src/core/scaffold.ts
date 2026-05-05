import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { resolveConfig } from "./resolve-config";
import type { I18nextKitConfig, ResolvedConfig } from "./types";

export const SCAFFOLD_MARKER = ".i18next-kit-scaffold";

type ScaffoldKind = "primary" | "new-i18n" | "new-locale";

type MarkerPayload = {
  version: 1;
  kind: ScaffoldKind;
  /** resolveConfig 时用的 i18nDir 相对 root 的路径（POSIX） */
  configuredI18nRelative: string;
};

const IGNORE_DIR_ENTRIES = new Set([".DS_Store", ".gitkeep"]);

function listI18nChildren(i18nDir: string): string[] {
  if (!existsSync(i18nDir)) {
    return [];
  }
  return readdirSync(i18nDir, { withFileTypes: true })
    .filter((d) => !IGNORE_DIR_ENTRIES.has(d.name))
    .map((d) => d.name);
}

function toPosixRel(root: string, abs: string): string {
  const rel = relative(root, abs);
  return rel.split("\\").join("/") || ".";
}

function readMarker(i18nAbs: string): MarkerPayload | undefined {
  const p = join(i18nAbs, SCAFFOLD_MARKER);
  if (!existsSync(p)) {
    return;
  }
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as MarkerPayload;
  } catch {
    return;
  }
}

function writeMarker(i18nAbs: string, payload: MarkerPayload) {
  writeFileSync(
    join(i18nAbs, SCAFFOLD_MARKER),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf-8"
  );
}

/**
 * 宿主已有可用布局（base 下至少一个 .ts 契约 + 各 locale 目录齐全）时不再自动脚手架，避免把完整项目误判为需写入 new-i18n。
 */
function isEstablishedI18nLayout(resolved: ResolvedConfig): boolean {
  const { i18nDir, contractsDir, locales } = resolved;
  if (!(existsSync(i18nDir) && existsSync(contractsDir))) {
    return false;
  }
  const contractEntries = readdirSync(contractsDir, { withFileTypes: true });
  const hasContractTs = contractEntries.some(
    (e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")
  );
  if (!hasContractTs) {
    return false;
  }
  for (const loc of locales) {
    const p = join(i18nDir, loc);
    if (!(existsSync(p) && statSync(p).isDirectory())) {
      return false;
    }
  }
  return true;
}

function classifyKind(resolved: ResolvedConfig): ScaffoldKind {
  const { i18nDir, contractsDir, locales } = resolved;
  if (!existsSync(i18nDir)) {
    return "primary";
  }
  const entries = listI18nChildren(i18nDir);
  if (entries.length === 0) {
    return "primary";
  }

  const localeSet = new Set(locales);
  const hasBase = existsSync(contractsDir);
  const onlyLocaleFolders =
    !hasBase &&
    entries.length > 0 &&
    entries.every((name) => localeSet.has(name));

  if (onlyLocaleFolders) {
    return "new-locale";
  }
  return "new-i18n";
}

function resolveAlternateRoot(
  resolved: ResolvedConfig,
  kind: "new-i18n" | "new-locale"
): string {
  return resolve(
    join(
      dirname(resolved.i18nDir),
      kind === "new-i18n" ? "new-i18n" : "new-locale"
    )
  );
}

/**
 * 若已由本工具脚手架化过，则沿用记录的有效 i18n 根目录，避免重复切换 alternate。
 */
function resolveEffectiveI18nAbs(resolved: ResolvedConfig): {
  abs: string;
  kind: ScaffoldKind;
} {
  const configuredRel = toPosixRel(resolved.root, resolved.i18nDir);

  const primaryMarker = readMarker(resolved.i18nDir);
  if (
    primaryMarker?.version === 1 &&
    primaryMarker.configuredI18nRelative === configuredRel
  ) {
    return { abs: resolved.i18nDir, kind: primaryMarker.kind };
  }

  for (const kind of ["new-i18n", "new-locale"] as const) {
    const alt = resolveAlternateRoot(resolved, kind);
    const m = readMarker(alt);
    if (m?.version === 1 && m.configuredI18nRelative === configuredRel) {
      return { abs: alt, kind: m.kind };
    }
  }

  const classified = classifyKind(resolved);
  if (classified === "primary") {
    return { abs: resolved.i18nDir, kind: "primary" };
  }
  return {
    abs: resolveAlternateRoot(
      resolved,
      classified === "new-i18n" ? "new-i18n" : "new-locale"
    ),
    kind: classified,
  };
}

const BASE_COMMON = `/**
 * i18next-kit 脚手架：契约命名空间 common（可随意增删 key）
 */
export type CommonMessage = {
  hello: string;
};
`;

function localeCommonSource(locale: string): string {
  let hello = "Hello";
  if (locale === "zh-CN" || locale.startsWith("zh")) {
    hello = "你好";
  }

  return `import type { CommonMessage } from "../base/common";

export default {
  hello: ${JSON.stringify(hello)},
} satisfies CommonMessage;
`;
}

function writeIfAbsent(file: string, content: string) {
  if (existsSync(file)) {
    return;
  }
  writeFileSync(file, content, "utf-8");
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

/**
 * 在磁盘上写入最小 i18n 模板（幂等：已有文件不覆盖），并返回应传给 generateAll 的配置（可能改写 i18nDir）。
 */
export function prepareI18nScaffold(
  userConfig: I18nextKitConfig
): I18nextKitConfig {
  if (userConfig.scaffold === false) {
    return userConfig;
  }

  const resolved = resolveConfig(userConfig);
  if (isEstablishedI18nLayout(resolved)) {
    return userConfig;
  }

  const { abs: effectiveI18nAbs, kind } = resolveEffectiveI18nAbs(resolved);

  const configuredRel = toPosixRel(resolved.root, resolved.i18nDir);
  const contractsAbs = userConfig.contractsDir
    ? resolveConfig({
        ...userConfig,
        i18nDir: toPosixRel(resolved.root, effectiveI18nAbs),
      }).contractsDir
    : join(effectiveI18nAbs, "base");

  ensureDir(contractsAbs);
  for (const loc of resolved.locales) {
    ensureDir(join(effectiveI18nAbs, loc));
  }

  writeIfAbsent(join(contractsAbs, "common.ts"), BASE_COMMON);
  for (const loc of resolved.locales) {
    writeIfAbsent(
      join(effectiveI18nAbs, loc, "common.ts"),
      localeCommonSource(loc)
    );
  }

  writeMarker(effectiveI18nAbs, {
    version: 1,
    kind,
    configuredI18nRelative: configuredRel,
  });

  const nextI18nRel = toPosixRel(resolved.root, effectiveI18nAbs);
  if (nextI18nRel === configuredRel && !userConfig.contractsDir) {
    return userConfig;
  }

  return {
    ...userConfig,
    i18nDir: nextI18nRel,
  };
}

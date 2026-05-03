/**
 * 校验问题
 * @code - 校验问题代码 MISSING_LOCALE_FILE: 缺失 locale 文件；EXTRA_LOCALE_FILE: 多余 locale 文件
 * @locale - locale 文件
 * @namespace - namespace 名称
 */
export type ValidationIssue = {
  code: "MISSING_LOCALE_FILE" | "EXTRA_LOCALE_FILE";
  locale: string;
  namespace: string;
};

/**
 * 校验报告
 * @ok - 是否校验通过
 * @issues - 校验问题列表
 */
export type ValidationReport = {
  ok: boolean;
  issues: ValidationIssue[];
};

type Namespace = {
  name: string;
};

type LocaleFile = {
  locale: string;
  namespace: string;
};

/**
 * 这个函数的逻辑是： 校验 locale 文件是否与 namespace 列表匹配，以及是否有多余的 locale 文件
 * 1. 遍历 locales 列表，遍历 namespace 列表，生成期望的 locale 文件列表
 * 2. 遍历 locale 文件列表，如果不在期望的 locale 文件列表中，则添加校验问题
 * 3. 返回校验报告
 * @param namespace - namespace 列表
 * @param localeFiles - locale 文件列表
 * @param locales - locales 列表
 * @returns - 校验报告
 */
export function validate(
  namespace: Namespace[],
  localeFiles: LocaleFile[],
  locales: string[]
) {
  // 存储校验问题列表
  const issues: ValidationIssue[] = [];
  // 存储已经存在的 locale 文件
  const have = new Set(
    localeFiles.map((file) => `${file.locale}::${file.namespace}`)
  );
  // 存储期望的 locale 文件
  const expected = new Set<string>();

  for (const locale of locales) {
    for (const ns of namespace) {
      const key = `${locale}::${ns.name}`;
      expected.add(key);
      // 如果期望的 locale 文件不存在，则添加校验问题
      if (!have.has(key)) {
        issues.push({
          code: "MISSING_LOCALE_FILE",
          locale,
          namespace: ns.name,
        });
      }
    }
  }

  for (const file of localeFiles) {
    const key = `${file.locale}::${file.namespace}`;
    // 如果出现意料之外的 locale 文件，则添加校验问题
    if (!expected.has(key)) {
      issues.push({
        code: "EXTRA_LOCALE_FILE",
        ...file,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

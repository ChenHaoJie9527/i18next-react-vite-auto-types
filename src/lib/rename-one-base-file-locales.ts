import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeIfChanged } from "@/core";
import type { ResolvedConfig } from "@/core/types";
import { createLocaleSource } from "./create-locale-source";
import { getBaseFileMetadata } from "./get-base-file-metadata";

/**
 * 重命名对应的 locale 文件
 * 1. 根据 base 目录里的文件名，找到对应的 locale 文件，base里原来叫 user.ts，那么en-US，zh-CN，zh-HK 目录里也有 user.ts 文件
 * 2. 把 base 里把 user.ts 改名为 new-user.ts，那么 en-US，zh-CN，zh-HK 目录里的 user.ts 文件也需要改名为 new-user.ts
 * 3. 逛该文件名还不够，文件第一行的 import ... from "../base/user-management" 和后面的类型吗也要改成新名字
 *
 * 解决思路：
 * 1. 算出 旧路径，新路径（和删，增用的同一套规则： join(i18nDir, locale namespace + '.ts')）
 * 2. 若就文件存在，新路径还没有 => 用系统的改名/移动 renameSync 挪过去，并记下 {from, to} 交给 renamedFiles
 * 3. 无论是挪过来的还是新路径上本来就有文件，都用 createLocaleSource + writeIfChanged 把内容刷新和 base 一致
 * 4. 若要严格保留翻译，再单独做 只是改前两行的策略
 * 5. 若新旧 base 的文件名其实一样（只改了前两行），那各语言下的路径不变，直接返回空数组即可
 */
export function renameOneBaseFileLocales(
  config: ResolvedConfig,
  oldFile: string,
  newFile: string
) {
  const oldMetadata = getBaseFileMetadata(oldFile);
  const newMetadata = getBaseFileMetadata(newFile);
  // 如果新旧文件名不合法，直接返回
  if (!(oldMetadata && newMetadata)) {
    return;
  }

  // 如果新旧文件名一样，直接返回空数组
  // 什么情况下新旧文件名会一样？比如 base 里把 user.ts 改名为 user-management.ts，那么各语言下的 user.ts 文件也需要改名为 user-management.ts
  if (oldMetadata.namespace === newMetadata.namespace) {
    return [];
  }

  // 给新文件写入创建模版
  const content = createLocaleSource(
    newMetadata.namespace,
    newMetadata.typeName
  );

  const renamedFiles: { from: string; to: string }[] = [];
  for (const locale of config.locales) {
    const from = join(config.i18nDir, locale, `${oldMetadata.namespace}.ts`);
    const to = join(config.i18nDir, locale, `${newMetadata.namespace}.ts`);

    // 创建新文件路径，确保目录存在
    mkdirSync(dirname(to), { recursive: true });

    // 判断旧文件是否存在
    if (existsSync(from)) {
      // 判断新文件是否存在
      if (existsSync(to)) {
        // 新文件存在，则删除旧文件
        rmSync(from, { force: true });
      } else {
        renameSync(from, to);
        renamedFiles.push({ from, to });
      }
    }
    // 写入新文件, 统一刷新模版内容
    writeIfChanged(to, content);
  }

  return renamedFiles;
}

# React + Vite i18n 自动扫描与契约校验（当前实现）

本文档对应当前项目 `client/src/i18n` 的落地实现，目标是同时满足：

- 运行时继续使用 Vite `import.meta.glob` 自动扫描多语言资源
- 编译期对 i18n 命名空间和 key 做强约束
- 在开发时通过 Vite HMR 自动触发类型入口生成，不需要手动频繁执行命令

---

## 1. 当前目录与分层

`src/i18n` 目前可以理解为 4 层：

1) 契约层：`base/*.ts`  
定义 namespace 和 key 的“源头契约”，例如 `common`、`file`、`user-management`、`table-columns`。

2) 实现层：`en-US/*.ts`、`zh-CN/*.ts`、`zh-HK/*.ts`  
每种语言按 namespace 落地实际文案。

3) 运行时层：`index.ts`  
使用 `import.meta.glob('./{en-US,zh-CN,zh-HK}/*.ts', { eager: true })` 动态组装 i18n `resources`。

4) 类型层：`generate-i18n-types.mjs` + `generated-resources.ts` + `i18next.d.ts` + `contracts.ts`  
- `generated-resources.ts`：由脚本从 `base` 自动生成，提供 namespace 类型入口  
- `i18next.d.ts`：把类型注册到 i18next  
- `contracts.ts`：显式导入三语言所有 namespace，做“缺文件/缺 key”编译校验

---

## 2. 运行时自动扫描（保留 glob）

`src/i18n/index.ts` 的核心逻辑：

```ts
import i18n, { type Resource, type ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultNS } from "./generated-resources";
import "./contracts";

const allResourcesModule: Record<string, unknown> = import.meta.glob(
  "./{en-US,zh-CN,zh-HK}/*.ts",
  { eager: true }
);

const resources: Resource = {
  "en-US": {},
  "zh-CN": {},
  "zh-HK": {},
};

for (const path in allResourcesModule) {
  const match = path.match(/^\.\/(en-US|zh-CN|zh-HK)\/(.+)\.ts$/);
  if (!match) continue;

  const [, locale, namespace] = match;
  const module = allResourcesModule[path] as { default: ResourceKey };
  resources[locale][namespace] = module.default;
}
```

说明：

- 运行时资源仍由 `glob` 收集，保持自动化
- `import "./contracts"` 只用于触发契约校验参与编译，不负责运行时聚合

---

## 3. 契约校验（contracts.ts）

`src/i18n/contracts.ts` 的职责是“编译期兜底”，不替代运行时扫描。

核心原则：

- 任一语言缺少某个 namespace 文件（如 `en-US/table-columns.ts`）=> 直接 TS 报错
- 文件存在但 key 不完整 => `satisfies` 报错

示例结构：

```ts
import type { CommonMessage } from "./base/common";
import type { FileMessage } from "./base/file";
import type { TableColumnsMessage } from "./base/table-columns";
import type { UserManagementMessage } from "./base/user-management";

import enUSTableColumns from "./en-US/table-columns";
import zhCNTableColumns from "./zh-CN/table-columns";
import zhHKTableColumns from "./zh-HK/table-columns";

type LocalContract = {
  common: CommonMessage;
  file: FileMessage;
  "user-management": UserManagementMessage;
  "table-columns": TableColumnsMessage;
};

export const contracts = {
  // en-US / zh-CN / zh-HK
} satisfies Record<"en-US" | "zh-HK" | "zh-CN", LocalContract>;
```

建议：

- 所有语言文件统一使用 `satisfies XxxMessage`
- 后续新增 namespace 时只要补 `base` + 三语言文件 + `contracts` 显式导入即可形成强约束

---

## 4. 类型入口由 base 自动生成

`scripts/generate-i18n-types.mjs` 现在已经改为扫描 `base`，不再绑定 `zh-HK`：

```js
const baseLocaleDir = path.join(projectRoot, "src", "i18n", "base");
const outputFile = path.join(projectRoot, "src", "i18n", "generated-resources.ts");
```

生成结果 `generated-resources.ts` 会从 `./base/*` 导入 namespace，并导出：

- `defaultNS`
- `resourceNamespaces`
- `I18nNamespace`

`i18next.d.ts` 将 `resourceNamespaces` 注入 `i18next`：

```ts
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: typeof resourceNamespaces;
  }
}
```

这保证了 `useTranslation(...)` / `t(...)` 的 namespace 与 key 提示来源稳定、且由契约层驱动。

---

## 5. Vite HMR 自动触发 i18n 类型生成

为避免每次手动跑 `pnpm i18n:types`，在 `vite.config.ts` 中接入本地插件。

### 5.1 插件示例

```ts
import { spawn } from "node:child_process";
import { defineConfig, type Plugin } from "vitest/config";

function runI18nTypes() {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("node", ["scripts/generate-i18n-types.mjs"], {
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`I18n types generation failed with code ${code}`));
    });
  });
}

function i18nTypesPlugin(): Plugin {
  return {
    name: "i18n-types-hmr",
    async buildStart() {
      await runI18nTypes();
    },
    async handleHotUpdate(ctx) {
      const normalized = ctx.file.replaceAll("\\", "/");
      if (normalized.includes("/src/i18n/base/") && normalized.endsWith(".ts")) {
        await runI18nTypes();
      }
    },
  };
}

export default defineConfig({
  plugins: [/* react(), */ i18nTypesPlugin()],
});
```

### 5.2 为什么监听 `base`

- `base` 是 namespace/key 契约源头
- 新增 `base/table-columns.ts` 时应第一时间更新类型入口
- 不再耦合某个具体语言目录（例如 `zh-HK`）

---

## 6. package scripts 建议

当前保留：

```json
"i18n:types": "node scripts/generate-i18n-types.mjs"
```

推荐：

- `dev` 直接跑 `vite`（已由 Vite 插件自动触发生成）
- 在 `check` 或 `build` 前串上 `pnpm i18n:types`，作为 CI 兜底

---

## 7. 新增 namespace 标准流程

以 `table-columns` 为例：

1. 在 `src/i18n/base/table-columns.ts` 定义 key（契约）
2. 在 `en-US/zh-CN/zh-HK` 新增对应 `table-columns.ts`（实现）
3. 在 `contracts.ts` 增加该 namespace 的显式导入与映射
4. 开发模式下由 HMR 自动生成 `generated-resources.ts`（或手动 `pnpm i18n:types`）
5. 在组件中 `useTranslation(["table-columns"])` + `t("...")` 使用

---

## 8. 常见问题

### Q1: 有了 `glob` 为什么还要 `contracts.ts`？

`glob` 解决“运行时自动收集”，但不会强制“每个语言都必须有同名文件、且 key 完整”。  
`contracts.ts` 负责编译期强约束，这两者是互补关系。

### Q2: `satisfies` 的价值是什么？

- 校验对象满足契约类型
- 同时保留对象本身更精细的推断信息
- 相比 `as` 断言更安全，适合契约层

### Q3: 为什么生成类型要从 `base` 扫描？

因为 `base` 才是“命名空间和 key”真正来源，类型系统应绑定契约，不应绑定某个语言实现目录。

---

## 9. 当前方案结论

这套实现已经形成完整闭环：

- 运行时：`index.ts + import.meta.glob` 自动扫描三语言
- 编译期：`contracts.ts + satisfies` 强制契约一致
- 类型入口：`generate-i18n-types.mjs` 从 `base` 自动生成
- 开发体验：Vite HMR 自动触发类型更新，减少手动命令

后续只需持续保持“base 先行、三语跟进、contracts 显式约束”的维护纪律即可。

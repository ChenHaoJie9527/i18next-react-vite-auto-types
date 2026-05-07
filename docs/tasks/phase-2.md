# Phase 2：Vite Plugin First

> Phase 1 已经完成 core：`generateAll(config)` 可以解析配置、扫描、校验、生成并写入 4 个产物。
> Phase 2 先选择 **Plugin**，把 core 接入 Vite 生命周期；CLI 暂后置。

---

## 0. 当前仓库状态（插件已重置，2026-05）

为便于 **v0.2 按 `docs/testing/v2.md` 自底向上重做**，`src/plugin/` 已收敛为**仅一个文件**：

| 路径 | 状态 |
|------|------|
| `src/plugin/index.ts` | **空壳**：`i18nextKit(options)` 只返回 `{ name: "i18next-kit" }`，`I18nextKitPluginOptions` 等同 `I18nextKitConfig`。 |

以下模块**已删除**，文中任务（P2-P02～P2-P05）描述的是**待重新实现**的目标；实现时可按 v2 约定拆到 `core`（纯逻辑）或 `src/plugin` 下新文件，**不必**恢复旧文件名（`paths.ts` / `hmr.ts` / `notify.ts` 等）。

- 已移除的插件侧文件（历史）：`hmr.ts`、`paths.ts`、`watch.ts`、`notify.ts`、`run-generate.ts`、`i18n-sources-watcher.ts`
- 已移除的插件相关单测：`plugin-watch.test.ts`、`plugin-paths.test.ts`、`i18n-sources-watcher.test.ts`
- **依赖**：`chokidar` 已从本包 `dependencies` 移除；若 v2 采用 chokidar 专职监听，再按需加回。

**产品方向补充**：详见 `docs/testing/v2.md`（`framework`、base↔locale 同步、MVP 静默体验等）。与下文 **P2-P05「overlay」** 冲突时，**以 v2 当前决策为准**（MVP 可先不做 overlay，后续再开关）。

---

## 1. 整体定位

Phase 2 的 Plugin 代码应是**薄壳**：真正的扫描、校验、生成、写文件都继续放在 `core`（base↔locale 同步等新增逻辑也优先放 `core`，插件只编排）。

Plugin 负责（目标能力，**当前空壳尚未实现**）：

1. 决定什么时候调用 `generateAll`（及 v2 下的 locale 同步等前置步骤）
2. 把错误和 validation 结果映射到 Vite dev/build 体验（v2 MVP 可先弱化）
3. 避免生成文件触发 HMR / 监听死循环

核心生命周期：

```text
i18nextKit(options)
  创建插件实例，保存用户配置

configResolved(viteConfig)
  拿到 Vite root/command/mode，合成 core 配置

configureServer(server)
  保存 dev server，用于 watcher、ws overlay、终端提示

buildStart()
  dev/build 启动时跑第一次 generateAll

handleHotUpdate(ctx)
  dev 下文件变化时判断是否需要重新 generateAll

buildEnd(error)
  构建结束时可做收尾；构建错误策略主要在 buildStart/generate 阶段处理
```

关键边界：

- `core` 不 import Vite
- `plugin` 不重新实现扫描/生成（编排 + 调用 `generateAll`）
- `plugin` 可以依赖 `generateAll` 返回的 `writtenFiles` 和 `validation`
- dev 尽量不杀 server；**build 是否因 validation 失败** 以 v2 / 发布前约定为准（MVP 可先放宽）

---

## 2. 如何编写 Vite 插件（本项目约定）

### 2.1 插件形态

Vite 插件在本仓库里体现为 **工厂函数**：接收 `I18nextKitPluginOptions`，返回 Vite 的 `Plugin` 对象；对象上按需挂接各类 [Plugin API 钩子](https://vite.dev/guide/api-plugin.html)。

```ts
import type { Plugin } from "vite";
import type { I18nextKitConfig } from "../core";

export type I18nextKitPluginOptions = I18nextKitConfig;

export function i18nextKit(options: I18nextKitPluginOptions): Plugin {
  let viteRoot: string;

  return {
    name: "i18next-kit",
    configResolved(config) {
      viteRoot = config.root;
      // 合并用户 options + viteConfig.root → resolvedConfig（见 P2-P02）
    },
    async buildStart() {
      // await generateAll(resolvedConfig)
    },
    configureServer(server) {
      // 保存 server，用于 ws overlay / 终端提示（见 P2-P05）
    },
    async handleHotUpdate(ctx) {
      // 仅源文件命中时 debounce 后再 generateAll（见 P2-P03 / P2-P04）
      // return [] 可阻止本次文件参与默认 HMR 图更新，避免生成物触发死循环
    },
  };
}
```

要点：

- **`name`**：必填，用于日志与 `vite --debug`；固定为 `i18next-kit`。
- **类型**：实现文件使用 `import type { Plugin } from "vite"`，只做类型擦除，不把 Vite 运行时打进插件产物；宿主通过 peer 安装 `vite`。
- **`enforce` / `apply`**（可选）：需要早于或晚于其它插件时用 `enforce: "pre" | "post"`；仅在 dev 或仅在 build 跑逻辑时用 `apply: "serve" | "build"`。本插件若 dev/build 都要生成，通常可省略。

### 2.2 在 vite.config 中注册

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { i18nextKit } from "i18next-kit";

export default defineConfig({
  plugins: [
    i18nextKit({ locales: ["en-US", "zh-CN"], mode: "folder" }),
    react(),
  ],
});
```

插件在 `plugins` 数组中的顺序会影响执行时机；建议在 `examples/basic` 里固定一种「先跑本插件生成，再由 React 等插件编译」的可复制顺序，并在联调时确认与 `@vitejs/plugin-react` 无冲突。

### 2.3 常用钩子写法（与第 1 节生命周期对应）

| 钩子 | 写法要点 |
|------|----------|
| **`configResolved`** | 第一个能稳定读到 `config.root`、`config.command`（`build` / `serve`）、`config.mode` 的位置；在此合成传给 `generateAll` 的配置。 |
| **`buildStart`** | 可声明为 `async buildStart()`；dev 与 build 启动时都会执行，适合做首次 `generateAll`。 |
| **`configureServer`** | 参数为 `ViteDevServer`；保存引用，便于 `server.ws.send` 推送 overlay（见 P2-P05）或读取 `server.config`。 |
| **`handleHotUpdate`** | 参数 `ctx` 含 `ctx.file`；路径与 `isSourceFile` 比对前建议规范化（如统一 `/`）。若希望本次变更不进入默认 HMR 模块图更新，可 **`return []`**；否则返回 `undefined` 走 Vite 默认行为。 |
| **`buildEnd`** | 签名为 `buildEnd(error?)`；适合做收尾统计。**validation / fatal 仍宜在生成阶段抛错**，避免只在 `buildEnd` 才失败。 |

若宿主用 **Vitest** 的 `defineConfig`（`vitest/config`），可从同一入口引入 `Plugin` 类型（对 Vite 类型的再导出），与仓库根目录 README 中的示例一致；**本包 `src/plugin` 源码**仍以 `vite` 的 `Plugin` 为准，并与 `package.json` 里 `peerDependencies.vite` 版本范围对齐。

### 2.4 单测与插件对象

可对 `const p = i18nextKit(options)` 断言 `p.name`、`typeof p.buildStart`，或在临时目录用 Vite 的 `createServer` / `build` 做更偏集成的验证；与 P2-P02 的单测验收配套。

### 2.5 本仓库内的完整插件开发闭环

目标：在 **`i18next-react-vite-auto-types` 仓库里改 `src/plugin`**，同时能在真实 Vite 应用里验证行为，且不混淆「源码」与「发布产物」。

| 环节 | 做法 |
|------|------|
| **实现** | 在 `src/plugin/index.ts`（及后续按需新增的少量同目录文件）写 Vite 钩子；**纯路径/防抖/同步逻辑**可放 `src/core`。业务仍调用 `generateAll`。 |
| **类型** | `import type { Plugin } from "vite"`；勿在 `core` 中 `import "vite"`。 |
| **产物** | 本仓库 `pnpm dev` 对应 `vite build --watch`（见根目录 `package.json`），持续更新 `dist/index.js` 与 `dist/index.d.ts`。宿主项目应依赖 **已构建的 dist**，不要 `import` 本仓库的 `src/`。 |
| **调试（无 UI）** | 宿主目录执行 `pnpm exec vite --debug` 或设置环境变量（见 [Vite 调试](https://vite.dev/guide/troubleshooting.html)），观察钩子顺序与重复执行次数。 |
| **调试（有 UI）** | 宿主安装 **`vite-plugin-inspect`**（见 2.6），在浏览器里看各插件 transform 与模块图。 |

联调时注意：若宿主通过 `file:` 指向本包，**watch 重建 dist 后**，有时需重启宿主 dev server（取决于 Vite 是否缓存已解析的插件模块）；若频繁改插件，可养成「保存插件 → 确认 dist 更新时间 → 重启宿主」的习惯，或在宿主里用 `optimizeDeps.exclude: ['i18next-kit']` 等策略减轻缓存（以实际表现为准再写死配置）。

### 2.6 使用 vite-plugin-inspect 调试

[`vite-plugin-inspect`](https://github.com/antfu/vite-plugin-inspect) 在开发服务器上提供 **`/__inspect/`** 可视化界面，用来核对：**配置解析后**、**各插件钩子是否按预期执行**、**模块经过哪些 transform**。调试「自己的插件有没有跑、跑几次、在哪个阶段跑」时非常有用。

**安装（装在宿主工程，例如 `test-i18nextKit`）：**

```bash
pnpm add -D vite-plugin-inspect
```

**`vite.config.ts` 推荐写法：把 Inspect 放在前面**，便于在界面里看到排在后面的 `i18nextKit`、React 等插件对流水线的影响：

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import Inspect from "vite-plugin-inspect";
import { i18nextKit } from "i18next-kit";

export default defineConfig({
  plugins: [
    Inspect(),
    i18nextKit({
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      // …与 examples/basic 对齐的其余选项
    }),
    react(),
  ],
});
```

**使用：**

1. 在宿主工程执行 `pnpm dev`（默认端口多为 `5173`，以终端输出为准）。
2. 浏览器打开 `http://localhost:<port>/__inspect/`（路径固定为 `__inspect`，见插件文档）。
3. 在界面中查看 **Modules / Plugins / Transform steps**，对照本仓库 `i18nextKit` 的 `name: "i18next-kit"` 是否出现在预期钩子上。

**构建期排查（可选）：** 若需要看 `vite build` 阶段的中间态，可对 `Inspect` 传入 `build: true` 与 `outputDir`，构建后静态打开输出目录；日常以 dev + `__inspect` 为主即可（详见 [vite-plugin-inspect README](https://github.com/antfu/vite-plugin-inspect)）。

**版本提示：** 宿主使用 Vite 8 时，若 `vite-plugin-inspect` 的 peer 范围尚未声明 Vite 8，可能出现 **pnpm/npm 的 peer 警告**；以能否正常打开 `__inspect` 为准，必要时升级到仓库 README 或 issue 中已验证的组合。

### 2.7 宿主工程 test-i18nextKit（本地联调）

你计划在仓库外（或与仓库同级）新建 **`test-i18nextKit`** 专门跑插件，推荐流程如下。

**1）创建 Vite + React + TS 应用**

```bash
pnpm create vite@latest test-i18nextKit --template react-ts
cd test-i18nextKit
pnpm install
```

**2）本地安装本包（不先发 npm）**

在 `test-i18nextKit` 目录执行（把路径换成你机器上 **`i18next-react-vite-auto-types` 的根目录** 的绝对路径）：

```bash
pnpm add -D file:/Users/you/path/to/i18next-react-vite-auto-types
```

这样依赖会指向该路径下的 `package.json`（入口为 `dist/`）。联调前务必在本包根目录先执行过一次 `pnpm build`，或开着本包的 `pnpm dev`（watch 构建）。

**3）配置 Vite：Inspect + i18nextKit + React**

按 **2.6** 写好 `plugins`；`i18nextKit` 的 `locales`、`contractsDir`、`i18nDir` 等需与 `test-i18nextKit` 里实际目录一致（可与 `examples/basic` 对齐后复制目录结构）。

**4）日常开发循环**

1. 终端 A：在本包根目录 `pnpm dev`（生成 watch 中的 `dist`）。  
2. 终端 B：在 `test-i18nextKit` 根目录 `pnpm dev`。  
3. 改本包 `src/plugin`（当前仅 `index.ts` 空壳，接入逻辑后再验证）→ 保存 → 确认 `dist` 更新 → 视情况重启终端 B。  
4. 用 `__inspect/` 确认 `i18next-kit` 钩子执行是否符合预期；用浏览器 + 改 i18n 源文件验证监听与生成物。

**5）若将来把宿主收进本 monorepo**

可在仓库根增加 `pnpm-workspace.yaml`，将 `examples/test-i18nextKit` 或 `test-i18nextKit` 列为 workspace 包，并把依赖写成 `"i18next-kit": "workspace:*"`；CI 与文档再统一约定目录名。当前阶段用 **同级目录 + `file:`** 即可独立验证。

---

## 3. Plugin MVP 任务拆解

### P2-P01. 收敛插件配置类型

| 文件 | 目标 |
|---|---|
| `src/plugin/index.ts` | `i18nextKit(options)` 复用 core 的 `I18nextKitConfig` |
| `src/core/types.ts` | 如有需要，导出插件可复用的配置类型（含 v2 的 `framework` 等） |

第一步保证 **options 类型与 core 一致**，不在 plugin 里重复维护一份配置 interface。

**当前进度**：空壳已满足下列写法；后续字段在 `types.ts` 扩展即可。

```ts
import type { I18nextKitConfig } from "../core/types";

export type I18nextKitPluginOptions = I18nextKitConfig;
```

验收：

- `i18nextKit({ locales: ['en-US'], mode: 'folder' })` 类型通过
- plugin 不再维护和 core 重复的配置字段
- `pnpm typecheck` 通过

**待补**：可选的最小单测（断言 `i18nextKit(...).name === 'i18next-kit'`），与下文 P2-P07 一并验收亦可。

### P2-P02. 插件首次生成

目标：Vite 启动 dev server 或 build 时，先跑一次 `generateAll`（v2 下可在其前插入 base↔locale 同步，见 `docs/testing/v2.md`）。

涉及文件（**待实现**，名称可调整）：

```text
src/plugin/index.ts          # 挂 buildStart / configResolved
# 可选：src/core/...         # 若抽出「应用生成结果」的纯函数，便于单测
# 可选：轻量日志模块         # v2 MVP 可先省略终端/overlay
```

> 历史文档曾写 `lifecycle.ts` / `notify.ts`，已随插件重置删除；重建时不必沿用旧文件名。

实现要点：

- `configResolved(viteConfig)` 中保存 Vite `command`，合并 `options.root ?? viteConfig.root`
- `buildStart()` 调用 `prepareI18nScaffold`（若仍启用）+ `generateAll({ ... , scaffold: false })`
- 终端与 validation 行为：**默认以 `docs/testing/v2.md` 为准**（MVP 可静默）；若与下列旧验收冲突，先满足 v2 再补严格模式
- build 模式下 validation 不通过时是否抛错：v2 暂可放宽，后续再与 CI 对齐

验收（建议）：

- 集成或单测覆盖：注册插件后 `buildStart` 会触发 `generateAll`（可用 mock）
- validation ok 时不应出现未处理异常
- build / dev 下错误策略与 v2 文档一致

### P2-P03. 源文件匹配（HMR / chokidar 共用）

目标：只在 i18n **契约与 locale 源文件**变化时驱动重新生成（或先跑 v2 的 locale 同步）。

需要识别：

```text
contractsDir/**/*.ts
i18nDir/<locale>/**/*.ts
```

需要忽略（生成物，位于 `outDir` 下）：

```text
generated-resources.ts
contracts.ts
generated-runtime.ts
i18next.d.ts
```

实现建议：

- **推荐**：在 `src/core/` 新增纯函数模块（如 `source-paths.ts`），导出 `normalizePath`、`isSourceFile`、`isGeneratedFile`，基于 `ResolvedConfig` 与绝对路径判断
- **触发方式**（二选一或并存，见 v2）：
  - Vite `handleHotUpdate(ctx.file)`（对已进模块图的文件有效）
  - **chokidar** 监听 `contractsDir`、各 locale 目录及 `i18n` 根（专职补「新建文件未进 HMR」场景）

验收：

- `base/common.ts` → source
- `en-US/common.ts` → source
- `outDir/contracts.ts` → generated，非 source
- 非 i18n 树内文件 → false

> 对应单测在插件重置时已删除，重建模块后应补回（可放在 `src/test/`，针对 `core` 路径判定）。

### P2-P04. 防抖与重新生成

目标：开发态保存文件时，合并短时间内的多次事件，只执行一次「同步（若启用）+ `generateAll`」。

实现建议：

- **debounce** 可内联于 `index.ts` 或放在 `src/core/debounce.ts`（纯工具，无 Vite）
- 间隔建议 **100ms**（与旧实现一致，可调）
- `handleHotUpdate` / chokidar 回调中：先过滤生成物，再判断 source，命中后 `scheduleRegenerate()`
- 返回 `[]` 与否：以避免生成物参与无意义 HMR 为准，需联调验证

验收：

- 连续触发多个源文件变化，合并为一次生成
- 生成文件变化不触发下一轮生成
- 改 base / locale 源文件后产物刷新

> 历史 `src/plugin/hmr.ts` 已删除；重建时不必恢复同名文件。

### P2-P05. Dev 诊断（Overlay / 终端）

目标：开发态错误可见，但不轻易杀 dev server。

**与 v2 对齐**：`docs/testing/v2.md` 约定 MVP **暂不**做强终端错误与 **overlay**；本节保留为 **Phase 2 完整版 / 后续迭代** 目标，实现时可做 `diagnostics: 'full' | 'none'` 一类开关。

错误分类（完整版）：

```text
I18nextKitError fatal:
  CONTRACTS_DIR_NOT_FOUND
  …（以 core 为准）

Validation:
  MISSING_LOCALE_FILE
  EXTRA_LOCALE_FILE
  …
```

实现建议（完整版）：

- 轻量 `logGenerateResult`（写入文件列表）
- validation / fatal 映射到终端与 `server.ws.send` overlay
- build 下 fatal / validation fail 抛错

验收（完整版）：

- 终端可看到生成与 warning
- dev 下 validation fail 有可见反馈
- build 下 validation fail 失败

**MVP（当前 v2）**：可先仅 `console.info` 成功写入（可选），不做 overlay。

### P2-P06. Example Basic

目标：用真实 Vite React 项目验证插件（与本仓库绑定的 fixture）。

目录：

```text
examples/basic/
```

另：**第 2.7 节的 `test-i18nextKit`** 用于「包消费者视角」联调（`file:` + inspect），与 `examples/basic` 互补；完整闭环见 **P2-P08**。

验收：

- `examples/basic` 中 `pnpm dev` 能启动（插件实现 P2-P02 后）
- 首次启动自动生成 4 个产物文件
- 修改 `src/i18n/base/common.ts` 后自动重新生成（监听实现后）
- 删除某个 locale 文件后的提示方式与 **v2 MVP** 一致（可无 overlay）
- `pnpm build` 是否在 validation fail 时失败：与 v2 / 团队约定一致

### P2-P07. Plugin Build 输出验证

目标：确认发布入口可用。

验收：

- `pnpm build` 后 `dist/index.js` 导出 `i18nextKit`
- `dist/index.d.ts` 暴露插件 options 类型
- 外部项目可以：

```ts
import { i18nextKit } from 'i18next-kit';
```

### P2-P08. Inspect + test-i18nextKit 联调闭环

目标：把 **第 2.5～2.7 节**写进可重复的验收动作里——插件不仅在本仓库单测里正确，也在真实 Vite 宿主中可观察、可调试。

验收：

- `test-i18nextKit`（或等价命名的宿主）能 `pnpm dev`，`vite.config` 中包含 **`vite-plugin-inspect`** 与 **`i18nextKit`**，浏览器可打开 `__inspect` 页面并看到 `i18next-kit` 相关插件条目。
- 宿主通过 **`file:`** 指向本仓库根路径；本仓库 **`pnpm dev`（watch dist）** 或 **`pnpm build`** 后，宿主侧功能与类型提示符合预期。
- 文档或 README 片段中给出 **可复制** 的 `pnpm add -D file:<绝对路径>` 与 `plugins: [Inspect(), i18nextKit(...), react()]` 示例（可与 `phase-2.md` 第 2 节一致，避免多处漂移）。

## 4. 暂缓的 CLI 任务

CLI 放到 Plugin MVP 后面。原因：

- Plugin 会先稳定配置类型和错误策略
- CLI 可以复用同一套 `generateAll` 和通知逻辑
- `init/add/generate` 的具体交互依赖 Plugin 配置形态

---

## 5. Plugin MVP 交付标准

完成 Phase 2（并与 v2 合并验收）后应能达到：

1. `examples/basic/`（或等价宿主）里 `pnpm dev` 能启动，插件非空壳：`buildStart` 至少执行 `generateAll`（及 v2 约定的同步逻辑）
2. 修改契约 / locale 源文件 → **无需重启 dev** 即可反映到生成物（chokidar 或 HMR 路径满足其一即可，v2 以 chokidar 为主）
3. 校验失败时的体验以 **`docs/testing/v2.md`** 为准（MVP 可先无 overlay）
4. `pnpm build` 行为与 v2 / CI 约定一致（若 MVP 不 fail build，需在文档明确）
5. `pnpm build` 后包入口导出 `i18nextKit` 与类型完整
6. **`test-i18nextKit`（或等价宿主）**：`file:` + 可选 `vite-plugin-inspect`，在 `__inspect` 中能看到 `i18next-kit` 钩子

---

## 6. 下一步

**P2-P01** 已由空壳满足类型收敛；建议按 **`docs/testing/v2.md` §5 推荐顺序**继续：

1. **`types` + `resolve-config`**：增加 `framework`、默认 `i18nDir` 等与 v2 一致的行为
2. **`core`**：base↔locale 同步（增删改、重命名策略）
3. **`src/plugin/index.ts`**：恢复 `buildStart` →（同步）→ `generateAll`；接入 **chokidar**（按需 `pnpm add chokidar`）与防抖；`configureServer` / `handleHotUpdate` 按 v2 取舍
4. **诊断**：先 MVP 静默，再实现 P2-P05 完整版开关
5. 补回 **路径判定 / watcher** 的单元测试（建议测 `core` 纯函数）
6. 并行 **第 2.7 节** `test-i18nextKit` + **P2-P08** 联调闭环

---

## 7. Phase 3 提示（更远的未来）

仅列提醒，不做规划：

- 单文件模式（`mode: 'file'`）：AST parse `zh-HK.ts` 的 named exports
- 懒加载 runtime：配合 `i18next-resources-to-backend` 的 glob 懒加载
- `doctor` 命令：独立检查 + 彩色报表
- 插件选项：`nameTransform` / `onGenerate` 钩子 / 自定义 `typeName` 后缀
- 发包：`prepublishOnly` 钩子、`changesets` 管版本、GitHub Actions 发 npm

# Phase 2：Vite Plugin First

> Phase 1 已经完成 core：`generateAll(config)` 可以解析配置、扫描、校验、生成并写入 4 个产物。
> Phase 2 先选择 **Plugin**，把 core 接入 Vite 生命周期；CLI 暂后置。

---

## 1. 整体定位

Phase 2 的 Plugin 代码是**薄壳**：真正的扫描、校验、生成、写文件都继续放在 `core`。

Plugin 只负责三件事：

1. 决定什么时候调用 `generateAll`
2. 把错误和 validation 结果映射到 Vite dev/build 体验
3. 避免生成文件触发 HMR 死循环

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
- `plugin` 不重新实现扫描/生成
- `plugin` 可以依赖 `generateAll` 返回的 `writtenFiles` 和 `validation`
- `plugin` 开发态尽量不中断 dev server，构建态遇到 validation 错误应失败

---

## 2. Plugin MVP 任务拆解

### P2-P01. 收敛插件配置类型

| 文件 | 目标 |
|---|---|
| `src/plugin/index.ts` | `i18nextKit(options)` 复用 core 的 `I18nextKitConfig` |
| `src/core/types.ts` | 如有需要，导出插件可复用的配置类型 |

当前 `src/plugin/index.ts` 自己定义了一份 `Config`，和 core 的 `I18nextKitConfig` 重复。第一步先删掉重复类型，改为：

```ts
import type { I18nextKitConfig } from '../core';

export type I18nextKitPluginOptions = I18nextKitConfig;
```

验收：

- `i18nextKit({ locales: ['en-US'], mode: 'folder' })` 类型通过
- plugin 不再维护和 core 重复的配置字段
- `pnpm typecheck` 通过

### P2-P02. 插件首次生成

目标：Vite 启动 dev server 或 build 时，先跑一次 `generateAll`。

涉及文件：

```text
src/plugin/index.ts
src/plugin/lifecycle.ts
src/plugin/notify.ts
```

实现要点：

- `configResolved(viteConfig)` 中保存 Vite root
- 用户未传 `root` 时使用 `viteConfig.root`
- `buildStart()` 调用 `generateAll(resolvedOptions)`
- 终端打印写入文件和 validation warning
- build 模式下 validation 不通过时抛错，让构建失败
- dev 模式下 validation 不通过时只 warning，dev server 继续活着

验收：

- 单测覆盖 `buildStart` 会调用生成流程
- validation ok 时不报错
- build 模式 validation fail 时抛错
- dev 模式 validation fail 时不抛错

### P2-P03. HMR 文件匹配

目标：只在 i18n 源文件变化时重新生成。

需要识别：

```text
contractsDir/**/*.ts
i18nDir/<locale>/**/*.ts
```

需要忽略：

```text
generated-resources.ts
contracts.ts
generated-runtime.ts
i18next.d.ts
```

实现建议：

- 新建 `src/plugin/paths.ts`
- 基于 `resolveConfig(options)` 算出绝对路径
- 提供 `isSourceFile(file)` / `isGeneratedFile(file)`
- 不引入 chokidar，直接使用 Vite `handleHotUpdate(ctx.file)`

验收：

- `base/common.ts` 返回 true
- `en-US/common.ts` 返回 true
- `contracts.ts` 返回 false
- 非 i18n 文件返回 false

### P2-P04. HMR 防抖与重新生成

目标：开发态保存文件时，合并短时间内的多次事件，只执行一次 `generateAll`。

实现建议：

- 新建 `src/plugin/hmr.ts`
- debounce 100ms
- `handleHotUpdate(ctx)` 中：
  - 先过滤 generated 文件
  - 再判断是否是 source 文件
  - 命中后调度重新生成
  - 返回 `[]` 或让 Vite 继续默认 HMR，需要结合实际验证

验收：

- 连续触发多个源文件变化，只调用一次生成
- 生成文件变化不会触发下一轮生成
- 手动改 base 文件后产物刷新

### P2-P05. Dev Overlay 与终端通知

目标：开发态错误可见，但不轻易杀 dev server。

错误分类：

```text
I18nextKitError fatal:
  CONTRACTS_DIR_NOT_FOUND
  EMPTY_CONTRACTS
  INVALID_CONFIG

Validation warning:
  MISSING_LOCALE_FILE
  EXTRA_LOCALE_FILE
```

实现建议：

- `notifySuccess(result)`
- `notifyValidationIssues(result.validation)`
- `notifyFatalError(error)`
- dev 下使用 `server.ws.send({ type: 'error', err: { message, stack } })`
- build 下 fatal/validation fail 抛错

验收：

- 终端能看到生成文件和 warning
- dev 下 validation fail 出现 overlay 或终端 warning
- build 下 validation fail 失败

### P2-P06. Example Basic

目标：用真实 Vite React 项目验证插件。

目录：

```text
examples/basic/
```

验收：

- `examples/basic` 中 `pnpm dev` 能启动
- 首次启动自动生成 4 个文件
- 修改 `src/i18n/base/common.ts` 后自动重新生成
- 删除某个 locale 文件后出现 warning/overlay
- `pnpm build` 在 validation fail 时失败

### P2-P07. Plugin Build 输出验证

目标：确认发布入口可用。

验收：

- `pnpm build` 后 `dist/index.js` 导出 `i18nextKit`
- `dist/index.d.ts` 暴露插件 options 类型
- 外部项目可以：

```ts
import { i18nextKit } from 'i18next-kit';
```

## 3. 暂缓的 CLI 任务

CLI 放到 Plugin MVP 后面。原因：

- Plugin 会先稳定配置类型和错误策略
- CLI 可以复用同一套 `generateAll` 和通知逻辑
- `init/add/generate` 的具体交互依赖 Plugin 配置形态

---

## 4. Plugin MVP 交付标准

完成 Phase 2 后应该能达到：

1. `examples/basic/` 里 `pnpm dev`，浏览器能看到"Hello World"
2. 修改 `base/common.ts` 加一个 key → 热更新自动重新生成 → 组件里 `t('newKey')` 有提示
3. 故意删掉 `zh-CN/common.ts` → 浏览器 overlay 出现红色错误，但页面仍然可交互
4. `pnpm build` → 若有 validation 错误，构建失败
5. `pnpm build` 后包入口导出和类型完整

---

## 5. 下一步

从 **P2-P01** 开始：

1. 让 plugin options 复用 core `I18nextKitConfig`
2. 给 `i18nextKit()` 返回值标注 Vite `Plugin`
3. 写最小 plugin 单测，锁住 `name` 和 options 类型
4. 再进入 P2-P02：`buildStart()` 首次生成

---

## 6. Phase 3 提示（更远的未来）

仅列提醒，不做规划：

- 单文件模式（`mode: 'file'`）：AST parse `zh-HK.ts` 的 named exports
- 懒加载 runtime：配合 `i18next-resources-to-backend` 的 glob 懒加载
- `doctor` 命令：独立检查 + 彩色报表
- 插件选项：`nameTransform` / `onGenerate` 钩子 / 自定义 `typeName` 后缀
- 发包：`prepublishOnly` 钩子、`changesets` 管版本、GitHub Actions 发 npm

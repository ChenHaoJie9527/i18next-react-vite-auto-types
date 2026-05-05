# Changelog

本文件记录 `i18next-kit` 的版本变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-05-04

首个对外可用的预览版本：核心代码生成 + Vite 插件接入，面向「Vite + React + i18next」的类型安全工作流。

### 新增

- **Core**：`generateAll` 串联解析配置、扫描契约与 locale、校验、生成并写入 4 个产物（`generated-resources.ts`、`contracts.ts`、`generated-runtime.ts`、`i18next.d.ts`）。
- **Core**：`resolveConfig` 统一解析 `root` / `i18nDir` / `contractsDir` / `outDir` 与 `locales`、`mode`（当前仅支持 `folder`）。
- **Core**：`scanContracts` 从契约目录推断 namespace 与 `typeName`；`scanLocalesFolder` 扫描各 locale 下的 `.ts` 源文件并识别**缺失的 locale 子目录**。
- **Core**：`validate` 产出 `ValidationReport`；含 `MISSING_LOCALE_FILE`、`EXTRA_LOCALE_FILE`、**`NO_CONTRACT_NAMESPACE`**（契约目录尚无命名空间 `.ts`）、**`LOCALE_DIR_MISSING`**（配置的 locale 目录不存在）。
- **Vite 插件**：`i18nextKit(options)`，`options` 与 core 的 `I18nextKitConfig` 对齐；在 `buildStart` 执行生成；dev 下通过 **HMR + `server.watcher`** 在契约/locale 变更或**新建目录**后防抖重新生成。
- **Dev 体验**：校验失败时终端与 **overlay** 提示；构建失败时校验/致命错误会终止构建；成功时可通过空 HMR `update` 清除 overlay；从致命错误恢复时输出提示日志。
- **监视可靠性**：将事件路径规范为相对 `config.root` 的绝对路径；对 i18n/契约/out 及其**祖先目录**调用 `watcher.add`，减少「必须先重启 dev 才看到最新提示」的情况。
- **文档**：Phase 2 任务说明中含 Vite 插件写法、`vite-plugin-inspect` 与宿主联调建议。

### 变更

- 契约目录**存在但为空**时不再抛出 `EMPTY_CONTRACTS`，改为与缺失 locale 目录等问题一并进入 **validation**，便于一次性看到待办项。

### 包与依赖

- **peerDependencies**：`vite`、`i18next`；`react-i18next` 与 `i18next-resources-to-backend` 为可选（按是否使用生成 runtime / React 集成安装）。

### 已知限制

- `mode: 'file'` 仍为配置校验阶段拒绝（未实现）。
- 极端环境下若文件系统事件仍不可靠，可在宿主 `vite.config` 中对 `server.watch` 尝试 `usePolling: true`。

[0.1.0]: https://github.com/ChenHaoJie9527/i18next-react-vite-auto-types/releases/tag/v0.1.0

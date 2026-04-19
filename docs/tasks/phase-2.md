# Phase 2：Plugin + CLI（大纲）

> 本阶段的具体任务**暂不展开**，等 Phase 1 完成后，再基于真实 core API 做一次细化。
> 本文档只记录**方向、子模块划分、已知难点**，供你规划心智。

---

## 1. 整体定位

Phase 2 的所有代码都是**薄壳**——真正的工作（扫描 + 生成）全部在 `core` 里。
- **Plugin** 把 core 接到 Vite 生命周期（`buildStart` / `handleHotUpdate` / `buildEnd`）
- **CLI** 把 core 接到命令行交互与文件写入

---

## 2. 子任务大纲

### Plugin 侧

| ID | 任务 | 难点 |
|---|---|---|
| P2-01 | `plugin/index.ts` — 导出 `i18nextKit(options)` | 让 options 类型复用 core 的 `I18nextKitConfig` |
| P2-02 | `plugin/lifecycle.ts` — `buildStart` 里跑一次 `generateAll` | dev/build 区分错误策略 |
| P2-03 | `plugin/hmr.ts` — `handleHotUpdate` 监听 `contractsDir` 和 locale 目录 | 防抖（debounce 100ms） |
| P2-04 | `plugin/notify.ts` — 失败通知 | 用 `server.ws.send({ type:'error', err:{...} })` 弹 overlay；`picocolors` 终端打印 |
| P2-05 | 文件变更忽略 | 自己生成的 4 个文件变动时**不触发** HMR 循环 |
| P2-06 | `configureServer` 里把 runtime glob 需要的 locales 透传 | 无 |

**已知坑**：
- **HMR 自触发死循环**：生成的 `generated-*.ts` 会被 Vite 的 watcher 触发下一轮 HMR，需要在 `handleHotUpdate` 里按产物路径**前置过滤**。
- **debounce**：多文件同时保存（比如 IDE "保存全部"）会连发事件，要合并。
- **overlay 内容**：Vite 的 error overlay 默认面向模块编译错误，送一个自定义 message 要注意结构。

### CLI 侧

| ID | 任务 | 难点 |
|---|---|---|
| P2-10 | `cli/index.ts` — 命令分发 | 用 `process.argv[2]` 直接分派或用 mri 等轻量 parser |
| P2-11 | `cli/commands/generate.ts` — 一次性生成（CI 用） | 复用 core.generateAll |
| P2-12 | `cli/commands/init.ts` — 交互式初始化 | 用 `@clack/prompts` 做流程 |
| P2-13 | `cli/commands/add.ts` — 新增 namespace | 必须同时更新 base + 每个 locale 的空模板 |
| P2-14 | `cli/templates/` — 模板引擎 | 简单字符串替换即可，别过度抽象 |
| P2-15 | `cli/detect.ts` — 检测 `i18next-resources-to-backend` 是否装 | lazy 模式下提示用户 `pnpm add -D` |

**交互式 `init` 流程草稿**：

```
? i18n 源目录？          (src/i18n)
? 要支持哪些语言？       [x] en-US  [x] zh-CN  [ ] zh-HK  (+ 自定义)
? 实现层模式？           • folder  • file
? 启用懒加载 runtime？    y/N
? 同意写入以下文件吗？    (列清单，按 y 确认)
✓ 创建 src/i18n/base/common.ts
✓ 创建 src/i18n/en-US/common.ts
...
✓ 提示：在 main.tsx 中 import { initI18n } from './i18n/generated-runtime'
```

**`add <ns>` 的最小实现**：

```ts
1. 读当前 config（从 vite.config.ts 里的 plugin 参数 or 独立的 .i18nkitrc）
2. 写 base/<ns>.ts  （空 type）
3. 对每个 locale，写 <locale>/<ns>.ts  （空 export default）
4. 提示用户 vite 会自动重新生成，或运行 npx i18next-kit generate
```

> **设计注意**：`add` 不主动跑 `generateAll` —— 让 Vite 插件或用户手动触发。原因：如果用户当前没开 dev server，跑生成会依赖 core 直接调用，这没问题；但如果开了 dev server，两个进程同时写文件会冲突。**简单起见 add 只写源文件，不动产物**。

### Example 工程

| ID | 任务 |
|---|---|
| P2-20 | `examples/basic/` — React + Vite + 插件完整 demo |
| P2-21 | examples 里的 `pnpm dev` 能看到 i18n 工作、改 base 后类型更新 |
| P2-22 | `examples/basic/README.md` — 演示路径 |

---

## 3. 交付标准

完成 Phase 2 后应该能达到：

1. `examples/basic/` 里 `pnpm dev`，浏览器能看到"Hello World"
2. 修改 `base/common.ts` 加一个 key → 热更新自动重新生成 → 组件里 `t('newKey')` 有提示
3. 故意删掉 `zh-CN/common.ts` → 浏览器 overlay 出现红色错误，但页面仍然可交互
4. `pnpm build` → 若有 validation 错误，构建失败
5. `npx i18next-kit init` 在新项目里能跑通
6. `npx i18next-kit add foo` 正确地在三处增加文件

---

## 4. 细化时机

**不要**现在展开 Phase 2 的子任务文档。理由：
- core API 真正成形前，plugin/CLI 如何调用是未知数
- 过早决定"哪个函数放哪里"会在 Phase 1 里被推翻
- Phase 1 完成后，core 的 `generateAll / scanContracts / validate` 是否 async、返回什么，都会影响 plugin 和 CLI 的实现形态

**操作建议**：
- Phase 1 最后一个任务 P1-10 / P1-11 完成时，回到本文档
- 基于真实的 core 接口，**把每个 P2-xx 子任务各自展开到 phase-2 目录下**（如 `docs/tasks/phase-2/P2-03-hmr.md`）
- 维持 Phase 1 的文档格式：目标 / 前置 / 接口 / 实现提示 / DoD

---

## 5. Phase 3 提示（更远的未来）

仅列提醒，不做规划：

- 单文件模式（`mode: 'file'`）：AST parse `zh-HK.ts` 的 named exports
- 懒加载 runtime：配合 `i18next-resources-to-backend` 的 glob 懒加载
- `doctor` 命令：独立检查 + 彩色报表
- 插件选项：`nameTransform` / `onGenerate` 钩子 / 自定义 `typeName` 后缀
- 发包：`prepublishOnly` 钩子、`changesets` 管版本、GitHub Actions 发 npm

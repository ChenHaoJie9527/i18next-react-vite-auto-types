# i18next-kit 开发任务总览

本目录是 `i18next-kit` 从 0 到 1 的**实施任务清单**，按阶段和优先级组织，用于独立编码时的执行指引。
每个任务有明确的**前置依赖、输入输出、验收标准**，完成后在本文件的进度表勾选即可。

---

## 0. 项目最终形态回顾

包名：`i18next-kit`（npm 已确认可用，备用 `vite-i18next-kit`）

对外提供两个能力：

1. **Vite 插件** — `import { i18nextKit } from 'i18next-kit'`
2. **CLI 脚手架** — `npx i18next-kit init | add <ns> | generate`

共享一份底层 core 逻辑（契约扫描、实现扫描、产物生成）。

```
┌──────────────┐     ┌──────────────┐
│ Vite 插件     │     │ CLI          │
│ plugin/       │     │ cli/         │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
   ┌───────────────────────────┐
   │  core/ (纯逻辑、无副作用)  │
   │  scan + validate + emit    │
   └───────────────────────────┘
```

---

## 1. 决策清单（已锁定）


| 维度             | 决策                                                                                  |
| -------------- | ----------------------------------------------------------------------------------- |
| 包名             | `i18next-kit`                                                                       |
| CLI bin        | `i18next-kit`                                                                       |
| 插件默认导出         | `i18nextKit()`                                                                      |
| 契约层            | `base/` 保留，两种模式都受其约束                                                                |
| 实现层模式          | `folder`（P1 实现）、`file`（P3 实现，named export）                                          |
| 懒加载            | 支持，依赖 `i18next-resources-to-backend`（peer optional）                                 |
| 生成产物           | `generated-resources.ts` / `contracts.ts` / `generated-runtime.ts` / `i18next.d.ts` |
| 生成产物默认位置       | `src/i18n/`（可 config 覆盖）                                                            |
| 生成文件是否入 git    | 入 git，文件头加 `/* AUTO-GENERATED — DO NOT EDIT */`                                     |
| `contracts.ts` | 完全生成式                                                                               |
| 运行时入口导出        | 函数 `initI18n(options?)`                                                             |
| 错误策略           | dev 不阻塞（overlay + console.warn）；build 阻塞；CLI 阻塞                                     |
| 命名映射           | folder 模式按 `base/` 文件名；file 模式自动 `kebab ↔ camelCase`，可 `nameTransform` 关            |
| JS 项目          | 可用但无类型提示，不单独适配                                                                      |
| 交互式 CLI 依赖     | `@clack/prompts`                                                                    |


---

## 2. 阶段划分


| 阶段                  | 目标                                                 | 可验证产物                                                       |
| ------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| **Phase 0**         | 基础设施改造（改名、重构目录、多入口构建、依赖）                           | `pnpm build` 能产出 `dist/core` `dist/plugin` `dist/cli` 三入口空壳 |
| **Phase 1**         | Core 纯逻辑（contracts 扫描 + folder 模式扫描 + 4 类产物生成）     | 有单测覆盖；能通过 node 脚本调用 `generateAll(config)` 生成 4 个文件          |
| **Phase 2**         | Plugin（HMR + overlay） + CLI（交互式 init/add/generate） | `examples/` 中的 fixture 工程跑通真实闭环                             |
| **Phase 3** *(未细化)* | 单文件模式 + 懒加载 runtime + `doctor`                     | -                                                           |


Phase 1 是最重的核心部分；Phase 2 只是套壳；Phase 3 待 Phase 2 落地后再细化。

---

## 3. 任务 DAG（强依赖关系）

```
P0-01 改包元信息
   └─► P0-02 重构目录
          └─► P0-03 多入口构建
                 └─► P0-04 补齐依赖
                        │
                        ▼
                 ┌── P1-01 core/types.ts (Config / ScanResult)
                 │
                 ├── P1-02 scan-contracts ──┐
                 ├── P1-03 scan-locales-folder ──┤
                 │                                ▼
                 │                           P1-04 validate
                 │                                │
                 │                                ▼
                 ├── P1-05 emit resources
                 ├── P1-06 emit contracts
                 ├── P1-07 emit runtime (eager)
                 ├── P1-08 emit dts
                 │        (P1-05 ~ P1-08 并行，彼此独立)
                 │
                 ▼
          P1-09 orchestrator generateAll()
                 │
                 ▼
          P1-10 单元测试（每模块 + 集成）
                 │
                 ▼
          P1-11 fixture 工程（__tests__/fixtures）
                 │
                 ▼
          ─── Phase 1 完成 ───
                 │
                 ▼
          Phase 2（plugin + cli + examples） — 大纲见 phase-2.md
```

---

## 4. 进度追踪

> 状态符号：⬜ 待办 ｜ 🟡 进行中 ｜ ✅ 已完成 ｜ ⏸ 暂缓 ｜ ❌ 已废弃
> 完成时把状态改成 ✅，并在「完成日期」列填上 `YYYY-MM-DD`。

### Phase 0：基础设施


| 状态  | ID        | 任务                                                   | 完成日期       |
| --- | --------- | ---------------------------------------------------- | ---------- |
| ✅  | **P0-01** | 改包元信息（`package.json` 改名 / peerDeps / scripts）        | 2026/04/19 |
| ⬜   | **P0-02** | 重构 `src/` 目录（`core` / `plugin` / `cli` / `index.ts`） | —          |
| ⬜   | **P0-03** | Vite 多入口构建 + `package.json.exports`                  | —          |
| ⬜   | **P0-04** | 补齐 dev/peer 依赖                                       | —          |


### Phase 1：Core 纯逻辑


| 状态  | ID        | 任务                                              | 完成日期 |
| --- | --------- | ----------------------------------------------- | ---- |
| ⬜   | **P1-01** | `core/types.ts`（Config / ScanResult / 错误类型）     | —    |
| ⬜   | **P1-02** | `core/scan-contracts.ts`                        | —    |
| ⬜   | **P1-03** | `core/scan-locales-folder.ts`                   | —    |
| ⬜   | **P1-04** | `core/validate.ts`                              | —    |
| ⬜   | **P1-05** | `core/emit/resources.ts`                        | —    |
| ⬜   | **P1-06** | `core/emit/contracts.ts`                        | —    |
| ⬜   | **P1-07** | `core/emit/runtime.ts`（eager 版本）                | —    |
| ⬜   | **P1-08** | `core/emit/dts.ts`                              | —    |
| ⬜   | **P1-09** | `core/orchestrate.ts`（`generateAll(config)` 入口） | —    |
| ⬜   | **P1-10** | 单元测试（覆盖率 ≥ 85%）                                 | —    |
| ⬜   | **P1-11** | Fixture 工程（`__tests__/fixtures/basic/`）         | —    |


### Phase 2：Plugin + CLI


| 状态  | ID      | 任务                                              | 完成日期 |
| --- | ------- | ----------------------------------------------- | ---- |
| ⏸   | **P2-** | 待 Phase 1 完成后细化，详见 `[phase-2.md](./phase-2.md)` | —    |


---

## 5. 使用建议

- **一次只推一个 task**，完成后跑 `pnpm test` 保证绿，再开下一个
- 每个 task 文档里都有"验收标准（DoD）"—— 写完务必对照一遍
- 遇到设计分歧、不想照 DoD 走，先在 `docs/tasks/decisions.md` 记一笔，别偷偷改 task（避免后续任务依赖失效）
- 提交规范建议：`feat(core): P1-02 scan contracts`、`test(core): P1-02 add unit tests`

详见：

- [Phase 0：基础设施](./phase-0.md)
- [Phase 1：Core 纯逻辑](./phase-1.md)
- [Phase 2：Plugin + CLI 大纲](./phase-2.md)


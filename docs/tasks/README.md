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
| **Phase 1**         | Core 纯逻辑，按 M1~M6 场景驱动推进（每步都端到端可跑）                  | `generateAll(config)` 一步生成 4 文件 + 单测覆盖 ≥ 85%                |
| **Phase 2**         | Plugin（HMR + overlay） + CLI（交互式 init/add/generate） | `examples/` 中的 fixture 工程跑通真实闭环                             |
| **Phase 3** *(未细化)* | 单文件模式 + 懒加载 runtime + `doctor`                     | -                                                           |


Phase 1 是最重的核心部分；Phase 2 只是套壳；Phase 3 待 Phase 2 落地后再细化。

---

## 3. 任务 DAG（强依赖关系）

Phase 1 改成了**场景驱动的里程碑式任务**（M1~M6），每个里程碑都是端到端能跑的完整版本，而不是孤立的原子任务。
详细实施步骤见 [`phase-1.md`](./phase-1.md)，旧版"按文件切任务"视角已备份到 [`phase-1.legacy.md`](./phase-1.legacy.md)。

```
P0-01 改包元信息
   └─► P0-02 重构目录
          └─► P0-03 多入口构建
                 └─► P0-04 补齐依赖
                        │
                        ▼
          ═══════════ Phase 1: Walking Skeleton ═══════════
                        │
          🎯 M1 最小闭环（1 ns × 1 locale → 终端打印 resources）
                        │
                        ▼
          🎯 M2 扩展多 ns × 多 locale + kebab-case
                        │
                        ▼
          🎯 M3 首次写盘 + contracts.ts 让 tsc 成为守门员
                        │
                        ▼
          🎯 M4 runtime.ts + i18next.d.ts → IDE 补全生效
                        │
                        ▼
          🎯 M5 validate + 错误码体系
                        │
                        ▼
          🎯 M6 generateAll 统一接口 + 单测锁住（≥85%）
                        │
                        ▼
          ─── Phase 1 完成 ───
                        │
                        ▼
          Phase 2（plugin + cli + examples） — 大纲见 phase-2.md
```

> **里程碑设计理念**：每个 M 都是"**当前版本能看见的价值增量**"，而不是某个孤立文件的完成度。M1 完成时就已经能跑通扫描+生成链路，只是规模小；M2~M5 逐步加功能，但永远保持端到端可验证。这样可以避免"写了 5 个模块但都串不起来"的沮丧节奏。

---

## 4. 进度追踪

> 状态符号：⬜ 待办 ｜ 🟡 进行中 ｜ ✅ 已完成 ｜ ⏸ 暂缓 ｜ ❌ 已废弃
> 完成时把状态改成 ✅，并在「完成日期」列填上 `YYYY-MM-DD`。

### Phase 0：基础设施


| 状态  | ID        | 任务                                                   | 完成日期       |
| --- | --------- | ---------------------------------------------------- | ---------- |
| ✅   | **P0-01** | 改包元信息（`package.json` 改名 / peerDeps / scripts）        | 2026/04/19 |
| ✅   | **P0-02** | 重构 `src/` 目录（`core` / `plugin` / `cli` / `index.ts`） | 2026/04/19 |
| ✅   | **P0-03** | Vite 多入口构建 + `package.json.exports`                  | 2026/04/20 |
| ✅   | **P0-04** | 补齐 dev/peer 依赖                                       | 2026/04/20         |


### Phase 1：Core 纯逻辑（场景驱动里程碑）

| 状态 | ID | 场景目标 | 预估 | 完成日期 |
|:--:|:--:|---|:--:|:--:|
| ⬜ | **M1** | 🎯 最小闭环 — 1 ns × 1 locale → 终端打印 `generated-resources.ts` | 1h | — |
| ⬜ | **M2** | 🎯 扩展多 ns × 多 locale，正确处理 kebab-case | 1h | — |
| ⬜ | **M3** | 🎯 首次写盘 + `contracts.ts`，故意删 locale 文件触发 `tsc` 报错 | 1.5h | — |
| ⬜ | **M4** | 🎯 `runtime.ts` + `i18next.d.ts`，让 `t('hello')` 有 IDE 补全 | 1h | — |
| ⬜ | **M5** | 🎯 `validate.ts` + 错误码体系，坏数据有清晰报告 | 1.5h | — |
| ⬜ | **M6** | 🎯 `generateAll()` 统一接口 + 单测覆盖率 ≥ 85% | 2h | — |

> 每个 M 的详细场景、产物预览、DoD 见 [`phase-1.md`](./phase-1.md)。


### Phase 2：Plugin + CLI


| 状态  | ID      | 任务                                              | 完成日期 |
| --- | ------- | ----------------------------------------------- | ---- |
| ⏸   | **P2-** | 待 Phase 1 完成后细化，详见 `[phase-2.md](./phase-2.md)` | —    |


---

## 5. 使用建议

- **一次只推一个里程碑**，完成后跑"完成后你能看到"里的验证，确认眼见为实再开下一个
- **不要跳步**：M1~M6 是线性依赖，M3 前不碰 runtime，M6 前不写单测
- 每个里程碑都有"故意没做的事"清单，**看到了就克制住超前优化的冲动**
- 遇到设计分歧、不想照 DoD 走，先在 `docs/tasks/decisions.md` 记一笔，别偷偷改任务（避免后续里程碑依赖失效）
- 提交规范建议：`feat(core): M1 minimal walking skeleton`、`feat(core): M3 emit contracts + atomic write`

详见：

- [Phase 0：基础设施](./phase-0.md)
- [Phase 1：Core 纯逻辑（场景驱动版）](./phase-1.md)
- [Phase 1 旧版（按文件切任务，作参考字典）](./phase-1.legacy.md)
- [Phase 2：Plugin + CLI 大纲](./phase-2.md)


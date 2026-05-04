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
| **Phase 1**         | Core 纯逻辑，按 Step 01~~35 线性推进，每 4~~6 步收束为一个 🏁 里程碑   | `generateAll(config)` 一步生成 4 文件 + 单测覆盖 ≥ 85%                |
| **Phase 2**         | Plugin（HMR + overlay） + CLI（交互式 init/add/generate） | `examples/` 中的 fixture 工程跑通真实闭环                             |
| **Phase 3** *(未细化)* | 单文件模式 + 懒加载 runtime + `doctor`                     | -                                                           |


Phase 1 是最重的核心部分；Phase 2 只是套壳；Phase 3 待 Phase 2 落地后再细化。

---

## 3. 任务 DAG（强依赖关系）

Phase 1 采用**线性 Step + 里程碑收束**的组织方式：35 个 Step 依次推进，每 4–6 个 Step 汇聚到一个 🏁 里程碑，里程碑处写单元测试锁住当前行为。详细步骤见 `[phase-1.md](./phase-1.md)`。

```
P0-01 改包元信息
   └─► P0-02 重构目录
          └─► P0-03 多入口构建
                 └─► P0-04 补齐依赖
                        │
                        ▼
          ═══════════ Phase 1: 线性 35 步 × 7 里程碑 ═══════════
                        │
          🏁 M1（Step 01–06）  第一个能转的轮子：scanContracts
                        │
                        ▼
          🏁 M2（Step 07–12）  第一段会说话的字符串：emitResources
                        │
                        ▼
          🏁 M3（Step 13–17）  让它真的写文件：writeIfChanged + 原子写
                        │
                        ▼
          🏁 M4（Step 18–22）  tsc 成为守门员：contracts.ts
                        │
                        ▼
          🏁 M5（Step 23–26）  t('hello') 有补全：runtime.ts + dts
                        │
                        ▼
          🏁 M6（Step 27–30）  错误说人话：错误码 + validate
                        │
                        ▼
          🏁 M7（Step 31–35）  一键串起来：generateAll + 覆盖率 ≥ 85%
                        │
                        ▼
          ─── Phase 1 完成 ───
                        │
                        ▼
          Phase 2（plugin + cli + examples） — 大纲见 phase-2.md
```

> **节奏设计理念**：每个 Step 只做一件 5~20 分钟能完成的小事，不提前定义类型、不提前抽配置、不提前处理边界。里程碑是"歇脚点"——到这里写测试锁住行为，后面不再回归破坏。避免写了 5 个模块但串不起来的沮丧节奏。

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
| ✅   | **P0-04** | 补齐 dev/peer 依赖                                       | 2026/04/20 |


### Phase 1：Core 纯逻辑（线性 Step + 🏁 里程碑）

> 每个 🏁 里程碑内部的 Step 全部完成并且单测绿了，才标 ✅。
> Step 级别的进度不在这里勾，在开发时对着 `phase-1.md` 边做边勾即可。


| 状态  | 🏁     | 覆盖 Step | 里程碑主题            | 里程碑单测                                                        | 完成日期 |
| --- | ------ | ------- | ---------------- | ------------------------------------------------------------ | ---- |
| ✅   | **M1** | 01–06   | 第一个能转的轮子         | `scan-contracts.test.ts`                                     | —    |
| ✅   | **M2** | 07–12   | 第一段会说话的字符串       | `emit/resources.test.ts`                                     | —    |
| ✅   | **M3** | 13–17   | 让它真的写文件          | `write.test.ts`                                              | —    |
| ✅   | **M4** | 18–22   | tsc 成为守门员        | `scan-locales-folder.test.ts` / `emit/contracts.test.ts`     | —    |
| ✅   | **M5** | 23–26   | `t('hello')` 有补全 | `emit/runtime.test.ts` / `emit/dts.test.ts`                  | —    |
| ✅   | **M6** | 27–30   | 错误说人话            | `validate.test.ts` + scan 错误场景                               | —    |
| ✅   | **M7** | 31–35   | 一键串起来 + 收官       | `resolve-config.test.ts` / `orchestrate.test.ts` + 覆盖率 ≥ 85% | —    |


> 每个 Step 的做法、代码样例、验证命令见 `[phase-1.md](./phase-1.md)`。

### Phase 2：Plugin + CLI


| 状态  | ID      | 任务                                              | 完成日期 |
| --- | ------- | ----------------------------------------------- | ---- |
| ⏸   | **P2-** | 待 Phase 1 完成后细化，详见 `[phase-2.md](./phase-2.md)` | —    |


---

## 5. 使用建议

- **一次只推一个 Step**：每个 Step 都配了 `✓ 验证`，跑绿再开下一个
- **里程碑是歇脚点**：到达 🏁 时先把单元测试写了、跑绿，再碰下一个 Step
- **不要跳步，也不要合并步**：Step 02 看起来蠢没关系，它在训练"快速肉眼验证"的肌肉记忆
- **克制住超前优化**：不要在 Step 03 就去定义 `Namespace` interface、不要在 Step 14 就去引入 `ResolvedConfig`，phase-1.md 会告诉你在哪一步引入
- 提交规范建议：`feat(core): step 06 scan contracts with typeName`、`test(core): M1 lock scanContracts behavior`

详见：

- [Phase 0：基础设施](./phase-0.md)
- [Phase 1：Core 纯逻辑（Step × 里程碑版）](./phase-1.md)
- [Phase 2：Plugin + CLI 大纲](./phase-2.md)


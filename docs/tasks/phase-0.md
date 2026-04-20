# Phase 0：基础设施改造

> 目标：把当前"单入口库脚手架"改造成"**core + plugin + cli 三入口**的 monopackage"，为 Phase 1 的 core 编码扫清障碍。
> 整个 Phase 不写业务代码，只调整构建 / 元信息 / 目录骨架。
>
> **耗时预估**：半天内应可完成。

---

## P0-01 改包元信息

### 目标
把包从"私人脚手架"变成准备发布的 `i18next-kit`。

### 前置
无

### 改动点（`package.json`）

| 字段 | 当前值 | 目标值 |
|---|---|---|
| `name` | `i18next-react-vite-auto-types` | `i18next-kit` |
| `version` | `0.0.1` | `0.1.0`（开始 pre-release） |
| `description` | 脚手架自带 | `Type-safe i18next toolkit for Vite + React: scaffold, scan, and generate namespaces & types.` |
| `keywords` | 脚手架自带 | `["i18next","react","vite","vite-plugin","i18n","typescript","codegen"]` |
| `bin` | 未定义 | `{ "i18next-kit": "dist/cli/index.js" }` |
| `dependencies` | `i18next` / `react-i18next` | 移除，挪到 `peerDependencies` |
| `peerDependencies` | 无 | `{ "vite": "^5 \|\| ^6", "i18next": "^23 \|\| ^24 \|\| ^25 \|\| ^26", "react-i18next": "^14 \|\| ^15 \|\| ^16 \|\| ^17" }` |
| `peerDependenciesMeta` | 无 | `{ "react-i18next": { "optional": true }, "i18next-resources-to-backend": { "optional": true } }` |
| `scripts.dev` | `vite build --watch` | 保留 |
| `scripts.prepublishOnly` | 已有 | 保留 |

> 说明：`react-i18next` 设为 optional peer，因为核心逻辑只用 `i18next` 的类型。用户若只用原生 i18next 也能用。

### 实现提示
- 因为改了 peer，记得 `pnpm install` 让锁文件同步
- `package-lock.json` 可以删掉（你已经在用 pnpm），只留 `pnpm-lock.yaml`

### 验收（DoD）
- [ ] `pnpm install` 无报错
- [ ] `pnpm typecheck` 仍能过（即使 src 是空的）
- [ ] 仓库里没有 `package-lock.json`
- [ ] `package.json` 的 `bin` / `peerDependencies` / `peerDependenciesMeta` 全部就位

---

## P0-02 重构 `src/` 目录

### 目标
建立三入口 + 共享 core 的目录骨架，每个文件先只放占位导出，保证 `tsc` 能过。

### 前置
P0-01

### 目标目录结构

```
src/
├── core/
│   ├── index.ts              # re-export 内部模块
│   ├── types.ts              # 占位（P1-01 填充）
│   ├── scan-contracts.ts     # 占位
│   ├── scan-locales-folder.ts
│   ├── validate.ts
│   ├── emit/
│   │   ├── index.ts
│   │   ├── resources.ts
│   │   ├── contracts.ts
│   │   ├── runtime.ts
│   │   └── dts.ts
│   └── orchestrate.ts        # 占位
│
├── plugin/
│   ├── index.ts              # export function i18nextKit() { return { name: 'i18next-kit' } as any }
│   └── ...                   # 细分文件留到 Phase 2
│
├── cli/
│   ├── index.ts              # #!/usr/bin/env node — 占位 console.log('i18next-kit cli')
│   └── commands/
│       ├── init.ts
│       ├── add.ts
│       └── generate.ts
│
└── index.ts                  # 库主入口：export * from './plugin'
```

### 实现提示
- 每个文件都写占位的 `export {}` 或空函数，**禁止 `.ts` 空文件**（Biome/ultracite 会报错）
- `cli/index.ts` 顶部加 shebang `#!/usr/bin/env node`，并确保构建时**不被压缩掉**
- `core/index.ts` 里暂时先 `export * from './types'`，随后 task 里逐步加

### 验收（DoD）
- [ ] 目录与上方一致
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm check`（ultracite）通过
- [ ] `plugin/index.ts` 导出的 `i18nextKit` 可以被外部 import 且不抛错

---

## P0-03 Vite 多入口构建

### 目标
让 `pnpm build` 同时产出 `dist/index.js`（plugin 主入口）/ `dist/core/index.js` / `dist/cli/index.js` 三份产物；并让 `package.json.exports` 正确对外暴露。

### 前置
P0-02

### 关键改动

#### 1. `vite.config.ts`
把单 entry 改成多 entry：

```ts
build: {
  lib: {
    entry: {
      index: 'src/index.ts',          // plugin 主入口
      'core/index': 'src/core/index.ts',
      'cli/index': 'src/cli/index.ts',
    },
    formats: ['es', 'cjs'],
  },
  rollupOptions: {
    external: [
      'vite', 'i18next', 'react-i18next',
      'node:fs', 'node:path', 'node:url', 'node:child_process',
      /^node:.*/,
      '@clack/prompts', 'picocolors', 'chokidar',
      'i18next-resources-to-backend',
    ],
    output: { exports: 'named' },
  },
},
```

#### 2. `package.json.exports`
```json
{
  "exports": {
    ".":       { "types": "./dist/index.d.ts",      "import": "./dist/index.js",      "require": "./dist/index.cjs" },
    "./core":  { "types": "./dist/core/index.d.ts", "import": "./dist/core/index.js", "require": "./dist/core/index.cjs" }
  },
  "bin": { "i18next-kit": "dist/cli/index.js" }
}
```

> 注意：`./cli` **不需要出现在 exports**，因为 CLI 是通过 `bin` 而不是 `import` 调用的。

#### 3. `vite-plugin-dts`

```ts
dts({
  tsconfigPath: './tsconfig.json',
  include: ['src'],
  exclude: ['**/*.test.ts', '**/*.spec.ts'],
  entryRoot: 'src',
  // ❌ 不要开 rollupTypes: true（见下方「常见坑」）
})
```

> ⚠️ **常见坑 — `rollupTypes: true` 在多入口下会吃掉类型**
>
> `vite-plugin-dts` 的 `rollupTypes: true` 只对**单入口**表现正常。多入口时它只给"主入口" rollup，
> 主入口里 `export * from './plugin'` 的 re-export 链会被中断，导致 `dist/index.d.ts` 里只剩 `export {}`。
>
> **症状**：运行时 `dist/index.js` 正常导出 `i18nextKit`，但 IDE 里报
> `模块 "i18next-kit" 没有导出的成员 "i18nextKit"`，TS 编译器也红线。
>
> **解决**：去掉 `rollupTypes`，改用 `entryRoot: 'src'` 按源码目录结构产出 d.ts。
> 产物会变成 `dist/index.d.ts` + `dist/plugin/index.d.ts` + `dist/core/index.d.ts`，
> 通过 re-export 链正常工作。radix-ui、@clack/prompts 等多入口库都是这个做法。

### 实现提示
- CLI 产物的 shebang：可在 `vite.config.ts` 里加一个小自定义 rollup 插件 `renderChunk` 时给 `cli/index.js` 顶部加 `#!/usr/bin/env node`（或者在 build 后加钩子脚本）
- 构建后需 `chmod +x dist/cli/index.js`，可在 `scripts.build` 后串一行 `&& chmod +x dist/cli/index.js`（Windows 无需）
- 插件占位函数的 `name` 字段**必须是字符串常量**（如 `'i18next-kit'`），不要放 config 对象，否则 Vite 启动时会警告 "plugin without a name"

### 验收（DoD）
- [ ] `pnpm build` 成功，`dist/` 下有 `index.*`、`core/index.*`、`cli/index.*` 及对应 `.d.ts`
- [ ] `dist/index.d.ts` 内容**不是** `export { }`（避免 rollupTypes 坑）
- [ ] `dist/cli/index.js` 第一行是 shebang 且有可执行权限
- [ ] 在另一个 test 项目里（推荐用 `pnpm add -D file:/absolute/path` 方案）`import { i18nextKit } from 'i18next-kit'` 类型完整，误传 options 会 TS 报错
- [ ] `npx i18next-kit` 能打印出占位信息（不报错）

---

## P0-04 补齐依赖

### 目标
一次性装齐 Phase 1 + Phase 2 需要的依赖，避免之后频繁 `pnpm add`。

### 前置
P0-03

### 要装的依赖（含决策）

#### devDependencies

| 包 | 用途 | 出现阶段 | 决策 |
|---|---|---|---|
| [`@biomejs/biome`](https://www.npmjs.com/package/@biomejs/biome) | Lint + Format | 全程 | ✅ 已有 |
| [`@types/node`](https://www.npmjs.com/package/@types/node) | Node 类型 | 全程 | ✅ 已有 |
| [`typescript`](https://www.npmjs.com/package/typescript) | TS 编译器 | 全程 | ✅ 已有 |
| [`ultracite`](https://www.npmjs.com/package/ultracite) | Biome 预设 | 全程 | ✅ 已有 |
| [`vite`](https://www.npmjs.com/package/vite) | 构建 | 全程 | ✅ 已有 |
| [`vite-plugin-dts`](https://www.npmjs.com/package/vite-plugin-dts) | 产出 d.ts | P0 | ✅ 已有 |
| [`vitest`](https://www.npmjs.com/package/vitest) / [`@vitest/coverage-v8`](https://www.npmjs.com/package/@vitest/coverage-v8) / [`@vitest/ui`](https://www.npmjs.com/package/@vitest/ui) | 单测 + 覆盖率 + UI | P1-10 | ✅ 已有 |
| [`@clack/prompts`](https://www.npmjs.com/package/@clack/prompts) | 交互式 CLI（[GitHub](https://github.com/natemoo-re/clack)） | P2 | ✅ 装 |
| [`picocolors`](https://www.npmjs.com/package/picocolors) | 终端彩色输出（轻量版 chalk） | P1/P2 | ✅ 装 |
| [`tmp`](https://www.npmjs.com/package/tmp) + [`@types/tmp`](https://www.npmjs.com/package/@types/tmp) | 单测临时目录（真实磁盘） | P1-10 | ✅ 装 |
| [`memfs`](https://www.npmjs.com/package/memfs) | 内存 FS 模拟 | - | ❌ 不装（和 tmp 二选一，选了 tmp） |
| [`chokidar`](https://www.npmjs.com/package/chokidar) | 文件 watcher | - | ❌ 不装（Vite `server.watcher` 自带，够用） |

#### peerDependencies

| 包 | 用途 | optional |
|---|---|---|
| [`vite`](https://www.npmjs.com/package/vite) `^5 \|\| ^6 \|\| ^7 \|\| ^8` | 必须 | 否 |
| [`i18next`](https://www.npmjs.com/package/i18next) `^23 \|\| ^24 \|\| ^25 \|\| ^26` | 必须 | 否 |
| [`react-i18next`](https://www.npmjs.com/package/react-i18next) `^14 \|\| ^15 \|\| ^16 \|\| ^17` | 可选 | ✅ 是 |
| [`i18next-resources-to-backend`](https://www.npmjs.com/package/i18next-resources-to-backend) `^1` | 懒加载 runtime | ✅ 是 |

### 一次装齐命令

```bash
pnpm add -D @clack/prompts picocolors tmp @types/tmp
```

### 实现提示

- 从 `dependencies` 移除 `i18next` / `react-i18next`，改到 `peerDependencies`（P0-01 已做）
- **不要**把 `vite` 放进 `dependencies`，否则用户装你的包会带一份重复 vite
- `peerDependenciesMeta.optional` 条目**必须**在 `peerDependencies` 里有对应版本声明，否则 npm/pnpm 都会告警
- `picocolors` 选择理由：比 `chalk` 小 14 倍，API 子集够用；CLI 工具标配
- `tmp` 选择理由：Node 原生 `fs` + 真实磁盘，测试行为真实，单测里 `dir.removeCallback()` 自动清理
- `@types/tmp` 必须单独装（`tmp` 本身没带类型声明）

### 验收（DoD）
- [ ] `pnpm install` 无 warning（peer 未装的警告可接受）
- [ ] `pnpm build` / `pnpm test` 仍通过
- [ ] `package.json` 的依赖分类清晰（dev vs peer），没有把 peer 塞进 dependencies
- [ ] `peerDependenciesMeta` 里的每个包都能在 `peerDependencies` 里找到对应版本声明
- [ ] `package.json.exports` 里**只有** `.` 和 `./core`（不要有 `bin` 等非法字段，`bin` 属于顶层字段）

---

## Phase 0 完成标志

跑一遍：

```bash
pnpm install && pnpm check && pnpm typecheck && pnpm test && pnpm build
```

全绿即可进入 Phase 1。此时仓库里已有完整骨架但**所有实际逻辑为空**，这是故意的——Phase 1 会把 core 里的占位全部填满。

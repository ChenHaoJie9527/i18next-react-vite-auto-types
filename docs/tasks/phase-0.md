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
`dts({ include: ['src'] })` 当前配置 OK，但要确认它为多 entry 都产出 `.d.ts`；如有问题，调整 `entryRoot: 'src'`。

### 实现提示
- CLI 产物的 shebang：可在 `vite.config.ts` 里加一个小自定义 rollup 插件 `renderChunk` 时给 `cli/index.js` 顶部加 `#!/usr/bin/env node`（或者在 build 后加钩子脚本）
- 构建后需 `chmod +x dist/cli/index.js`，可在 `scripts.build` 后串一行 `&& chmod +x dist/cli/index.js`（Windows 无需）

### 验收（DoD）
- [ ] `pnpm build` 成功，`dist/` 下有 `index.*`、`core/index.*`、`cli/index.*` 及对应 `.d.ts`
- [ ] `dist/cli/index.js` 第一行是 shebang 且有可执行权限
- [ ] 在另一个 test 项目里 `pnpm link` 后，`import { i18nextKit } from 'i18next-kit'` 类型完整
- [ ] `npx i18next-kit` 能打印出占位信息（不报错）

---

## P0-04 补齐依赖

### 目标
一次性装齐 Phase 1 + Phase 2 需要的依赖，避免之后频繁 `pnpm add`。

### 前置
P0-03

### 要装的依赖

**devDependencies**（全部）：

| 包 | 用途 | 出现阶段 |
|---|---|---|
| `@types/node` | ✅ 已有 | - |
| `vite` | ✅ 已有 | - |
| `vitest` / `@vitest/coverage-v8` / `@vitest/ui` | ✅ 已有 | P1-10 |
| `@clack/prompts` | 交互式 CLI | P2 |
| `picocolors` | 终端彩色输出 | P1/P2 |
| `chokidar` | （如果后面发现 Vite 自带 watcher 不够用时备用，先不装也可） | P2 |
| `memfs` | 单测里模拟文件系统（强烈推荐） | P1-10 |
| `tmp` | 单测里生成临时目录（memfs 的替代方案） | P1-10 |

**peerDependencies**（声明即可，实际安装留给用户）：

| 包 | 用途 |
|---|---|
| `vite` | 必须 |
| `i18next` | 必须 |
| `react-i18next` | 可选（optional） |
| `i18next-resources-to-backend` | 可选（懒加载 runtime 时） |

### 实现提示
- 从 `dependencies` 移除 `i18next` / `react-i18next`，改到 `peerDependencies`
- **不要**把 `vite` 放进 `dependencies`，否则用户装你的包会带一份重复 vite
- `memfs` 和 `tmp` 二选一即可，推荐 `memfs` 更快，但 `tmp` 语义更直观。第一次实现可用 `tmp` + 真实磁盘（节点写文件也就 ms 级），后面再看要不要换

### 验收（DoD）
- [ ] `pnpm install` 无 warning（peer 未装的警告可接受）
- [ ] `pnpm build` / `pnpm test` 仍通过
- [ ] `package.json` 的依赖分类清晰（dev vs peer），没有把 peer 塞进 dependencies

---

## Phase 0 完成标志

跑一遍：

```bash
pnpm install && pnpm check && pnpm typecheck && pnpm test && pnpm build
```

全绿即可进入 Phase 1。此时仓库里已有完整骨架但**所有实际逻辑为空**，这是故意的——Phase 1 会把 core 里的占位全部填满。

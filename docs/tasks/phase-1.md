# Phase 1：Core 纯逻辑 — 像造自行车一样

> **这份文档从头到尾线性阅读即可**。
> 每个 Step 都只做一件小事，大多数在 **5–20 分钟** 内完成。
> 每 4–6 个 Step 汇聚成一个 🏁 **里程碑**，在里程碑收尾处写一个单元测试锁住当前行为——
> 从此以后，后面的 Step 不会偷偷把前面做好的东西搞坏。
>
> 开工前记住三句话：
> 1. **不要提前定义类型**。等真正有两处用到同一个 shape 时再抽。
> 2. **不要提前配置**。硬编码路径和魔法字符串都是允许的，直到你自己烦了。
> 3. **不要提前做边界处理**。坏输入就让它炸，等我们在某个 Step 明确说"这一步来加保护"才加。

---

## 路线图一览

| 🏁 里程碑 | 场景上的价值 | 步骤 |
|---|---|---|
| **M1 第一个能转的轮子** | 能读目录，吐出 namespace 名字数组 | Step 01–06 |
| **M2 第一段会说话的字符串** | 把数组拼成一段合法的 TS 代码打印出来 | Step 07–12 |
| **M3 让它真的写文件** | 产物落盘、幂等、原子；fixture 里 `tsc` 能过 | Step 13–17 |
| **M4 让 tsc 成为守门员** | contracts.ts 诞生，删个 locale 文件就 tsc 报错 | Step 18–22 |
| **M5 让 `t('hello')` 有补全** | runtime + dts，fixture 里 App.tsx 有类型提示 | Step 23–26 |
| **M6 让错误说人话** | 错误码体系 + validate，坏数据有彩色报告 | Step 27–30 |
| **M7 一键串起来 + 收官** | `generateAll()` 单一入口 + 覆盖率 ≥ 85% | Step 31–35 |

---

## 通用约定

- **fixture 位置**：`__tests__/fixtures/basic/`，整个 Phase 1 就围绕它长
- **临时驱动脚本**：`scripts/dev-run.mjs`，用来跑 core 函数并肉眼看效果
- **跑一次循环**：`pnpm build && node scripts/dev-run.mjs`（Step 34 会引入 `tsx` 省去 build）
- **验证命令**：后文出现的 `✓ 验证` 一律是在 Phase 1 主仓库目录下执行

---

## 🏁 M1. 第一个能转的轮子

**这一轮结束时你拥有的东西**：一个函数 `scanContracts(dir)`，喂目录路径，吐出数组 `[{ name: 'common', typeName: 'CommonMessage' }]`。就这。
没有类型定义，没有 config 对象，没有错误处理。

---

### Step 01. 建一个只有一个文件的 fixture

只做一件事：给 fixture 起个头。

```bash
mkdir -p __tests__/fixtures/basic/base
echo "export type CommonMessage = { hello: string };" > __tests__/fixtures/basic/base/common.ts
```

✓ 验证：`ls __tests__/fixtures/basic/base/` 看到 `common.ts`。

---

### Step 02. 写第一个能读到这个目录的函数

新建 `src/core/scan-contracts.ts`：

```ts
import { readdirSync } from 'node:fs';

export function scanContracts(dir: string) {
  return readdirSync(dir);
}
```

在 `src/core/index.ts` 里 re-export（之前是空占位）：

```ts
export { scanContracts } from './scan-contracts';
```

新建 `scripts/dev-run.mjs`：

```js
import { scanContracts } from '../dist/core/index.js';

console.log(scanContracts('./__tests__/fixtures/basic/base'));
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# → [ 'common.ts' ]
```

看到数组就成功。**这是你造出来的第一个轮子，花了 10 分钟，它能转。**

---

### Step 03. 过滤只保留 `.ts` 文件

在 fixture 里故意扔一个干扰项：

```bash
echo "type Foo = {};" > __tests__/fixtures/basic/base/common.d.ts
```

再跑 `pnpm build && node scripts/dev-run.mjs` —— 输出里多了 `common.d.ts`，我们不想要它。

修改 `scan-contracts.ts`：

```ts
return readdirSync(dir).filter(
  (f) => f.endsWith('.ts') && !f.endsWith('.d.ts'),
);
```

✓ 验证：输出恢复为 `[ 'common.ts' ]`。

> **验证完顺手清理掉 `common.d.ts`**：它的使命就是验证 filter，留着会在 M3 跑 `tsc --noEmit` 时干扰模块解析（一个无 import/export 的 `.d.ts` 会被 TS 当成全局脚本，并优先于同名 `.ts`，导致 `Cannot find module` 报错）：
>
> ```bash
> rm __tests__/fixtures/basic/base/common.d.ts
> ```

---

### Step 04. 去掉 `.ts` 后缀，只返回名字

```ts
return readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => f.replace(/\.ts$/, ''));
```

✓ 验证：`[ 'common' ]`。

---

### Step 05. 返回结构化对象，为将来留空间

```ts
return readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => ({ name: f.replace(/\.ts$/, '') }));
```

✓ 验证：`[ { name: 'common' } ]`。

> 现在函数从"返回 string[]"升级成了"返回 object[]"，但**还是没定义任何 `interface`**。等有第二个地方需要这个类型时再抽。

---

### Step 06. 加 `typeName` 字段，顺便处理 `kebab-case`

先再扔一个 fixture 进去：

```bash
echo "export type UserManagementMessage = { title: string };" \
  > __tests__/fixtures/basic/base/user-management.ts
```

在 `scan-contracts.ts` 顶部加一个小工具函数：

```ts
function toPascalCase(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}
```

然后 map 里补一行：

```ts
.map((f) => {
  const name = f.replace(/\.ts$/, '');
  return { name, typeName: toPascalCase(name) + 'Message' };
});
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# [
#   { name: 'common', typeName: 'CommonMessage' },
#   { name: 'user-management', typeName: 'UserManagementMessage' }
# ]
```

---

### 🏁 M1 单元测试：锁住 scanContracts 的行为

新建 `src/core/scan-contracts.test.ts`：

```ts
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanContracts } from './scan-contracts';

function makeTmpDir() {
  const dir = mkdtempSync(join(tmpdir(), 'i18next-kit-test-'));
  return dir;
}

describe('scanContracts', () => {
  it('返回目录下的 .ts 文件名，忽略 .d.ts', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'common.ts'), '');
    writeFileSync(join(dir, 'common.d.ts'), '');
    writeFileSync(join(dir, 'file.ts'), '');

    const result = scanContracts(dir);

    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'common', typeName: 'CommonMessage' },
        { name: 'file', typeName: 'FileMessage' },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it('kebab-case 命名会正确 Pascal 化', () => {
    const dir = makeTmpDir();
    writeFileSync(join(dir, 'user-management.ts'), '');

    expect(scanContracts(dir)).toEqual([
      { name: 'user-management', typeName: 'UserManagementMessage' },
    ]);
  });
});
```

✓ 验证：

```bash
pnpm test
# ✓ scan-contracts (2)
```

绿了就可以进 M2。

---

## 🏁 M2. 第一段会说话的字符串

**这一轮结束时你拥有的东西**：一个 `emitResources(namespaces)` 函数，喂它 Step 06 的扫描结果，吐出一段合法的 TypeScript 代码（字符串），粘到 VSCode 里 `tsc` 能过。

---

### Step 07. 写第一版 `emitResources`，返回写死的字符串

新建 `src/core/emit/resources.ts`：

```ts
export function emitResources() {
  return `export const defaultNS = 'common' as const;\n`;
}
```

在 `src/core/index.ts` 补 export：

```ts
export { emitResources } from './emit/resources';
```

修改 `scripts/dev-run.mjs`：

```js
import { scanContracts, emitResources } from '../dist/core/index.js';

const namespaces = scanContracts('./__tests__/fixtures/basic/base');
console.log(emitResources());
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# export const defaultNS = 'common' as const;
```

看起来蠢，但这就是第一块会"说话"的积木。

---

### Step 08. 动态拼 `import type` 语句

改造 `emitResources` 接收扫描结果，并为每个 namespace 拼一行 import：

```ts
type Namespace = { name: string; typeName: string };

export function emitResources(namespaces: Namespace[]) {
  const imports = namespaces
    .map((ns) => `import type { ${ns.typeName} } from './base/${ns.name}';`)
    .join('\n');

  return `${imports}\n\nexport const defaultNS = 'common' as const;\n`;
}
```

> **路径约定**：产物文件（`generated-resources.ts` / `contracts.ts` / `generated-runtime.ts` / `i18next.d.ts`）都生成到 `basic/` 根目录，而 `base/` 是它们的**子目录**——所以这里用 `'./base/${name}'`。
> `en-US/common.ts` 写的 `'../base/common'` 是因为它自己在 `en-US/` 下，往上一层才到 `base/` 的兄弟位置，别把这两种路径搞混了。

同时 `dev-run.mjs`：

```js
console.log(emitResources(namespaces));
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# import type { CommonMessage } from './base/common';
# import type { UserManagementMessage } from './base/user-management';
#
# export const defaultNS = 'common' as const;
```

---

### Step 09. 加 `resourceNamespaces` 对象

```ts
const entries = namespaces
  .map((ns) => `  ${ns.name}: {} as ${ns.typeName},`)
  .join('\n');

const body = `export const resourceNamespaces = {
${entries}
} as const;`;

return `${imports}\n\nexport const defaultNS = 'common' as const;\n\n${body}\n`;
```

✓ 验证输出里应该有：

```ts
export const resourceNamespaces = {
  common: {} as CommonMessage,
  user-management: {} as UserManagementMessage,   // ← 下一步会修这个语法错
} as const;
```

发现 `user-management` 作为 JS 标识符是**非法的**——下一步修。

---

### Step 10. 给 kebab-case 的 key 加引号

在 `resources.ts` 顶部加一个小工具：

```ts
function formatKey(name: string): string {
  return /^[a-zA-Z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}
```

把 entries 那行改成：

```ts
.map((ns) => `  ${formatKey(ns.name)}: {} as ${ns.typeName},`)
```

✓ 验证：输出里 `'user-management': {} as UserManagementMessage,` 加上引号了。

---

### Step 11. 加 `defaultNS` 的推断 + `I18nNamespace` 类型

现在 `defaultNS` 写死了 `'common'`，其实应该取扫描结果的第一个（字母序）。

```ts
const sorted = [...namespaces].sort((a, b) => a.name.localeCompare(b.name));
const defaultNSName = sorted[0]?.name ?? 'common';

const imports = sorted.map(/* ... */).join('\n');
const entries = sorted.map(/* ... */).join('\n');

return `${imports}

export const defaultNS = ${JSON.stringify(defaultNSName)} as const;

${body}

export type I18nNamespace = keyof typeof resourceNamespaces;
`;
```

✓ 验证：输出尾部多出 `export type I18nNamespace = ...`。

---

### Step 12. 加 AUTOGEN 文件头，丢到 VSCode 里跑 `tsc`

在 `resources.ts` 最顶部加一个常量：

```ts
const HEADER = `/**
 * AUTO-GENERATED by i18next-kit — DO NOT EDIT.
 */
`;
```

然后 return 时拼在最前面：

```ts
return `${HEADER}\n${imports}\n\n...`;
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs > /tmp/out.ts
# 把 /tmp/out.ts 拖进 VSCode，看有没有红线
# 或者：
cd __tests__/fixtures/basic && cp /tmp/out.ts generated-resources.ts
npx tsc --noEmit --target ES2022 --moduleResolution Bundler generated-resources.ts
# 应该零输出
rm generated-resources.ts
```

零错误 = 你的 emit 产物已经是**合法可编译的 TypeScript**。🎉

---

### 🏁 M2 单元测试：锁住 `emitResources` 的 snapshot

新建 `src/core/emit/resources.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { emitResources } from './resources';

describe('emitResources', () => {
  it('一个 namespace 时输出正确结构', () => {
    const out = emitResources([{ name: 'common', typeName: 'CommonMessage' }]);
    expect(out).toMatchInlineSnapshot();
    // 首次运行 vitest 会自动填入 snapshot，review 时肉眼确认即可
  });

  it('kebab-case 的 key 会加引号', () => {
    const out = emitResources([
      { name: 'common', typeName: 'CommonMessage' },
      { name: 'user-management', typeName: 'UserManagementMessage' },
    ]);
    expect(out).toContain(`'user-management': {} as UserManagementMessage,`);
    expect(out).toContain('common: {} as CommonMessage,');
  });

  it('defaultNS 取字母序第一', () => {
    const out = emitResources([
      { name: 'zulu', typeName: 'ZuluMessage' },
      { name: 'alpha', typeName: 'AlphaMessage' },
    ]);
    expect(out).toContain(`export const defaultNS = 'alpha' as const`);
  });

  it('产物包含 AUTO-GENERATED 头', () => {
    const out = emitResources([{ name: 'x', typeName: 'XMessage' }]);
    expect(out.startsWith('/**\n * AUTO-GENERATED')).toBe(true);
  });
});
```

✓ 验证：`pnpm test` 全绿。

---

## 🏁 M3. 让它真的写文件

**这一轮结束时你拥有的东西**：产物不再是 `console.log`，而是真的落到 fixture 目录里；内容一致时跳过写入；fixture 下 `tsc --noEmit` 通过。

---

### Step 13. 第一次用 `fs.writeFile` 落盘

在 `dev-run.mjs` 里：

```js
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = './__tests__/fixtures/basic';
const namespaces = scanContracts(join(outDir, 'base'));
writeFileSync(join(outDir, 'generated-resources.ts'), emitResources(namespaces));
console.log('✓ wrote generated-resources.ts');
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# ✓ wrote generated-resources.ts
ls __tests__/fixtures/basic/generated-resources.ts   # 存在
```

---

### Step 14. 抽出 `writeIfChanged`，加幂等

新建 `src/core/write.ts`：

```ts
import { readFileSync, writeFileSync } from 'node:fs';

export function writeIfChanged(path: string, content: string): boolean {
  try {
    if (readFileSync(path, 'utf8') === content) {
      return false;
    }
  } catch {
    // 文件不存在，下面写入
  }
  writeFileSync(path, content, 'utf8');
  return true;
}
```

在 `src/core/index.ts` 补 export，然后 `dev-run.mjs` 改用它：

```js
const changed = writeIfChanged(
  join(outDir, 'generated-resources.ts'),
  emitResources(namespaces),
);
console.log(changed ? '✓ wrote generated-resources.ts' : '· skipped (no change)');
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# ✓ wrote generated-resources.ts
pnpm build && node scripts/dev-run.mjs
# · skipped (no change)     ← 第二次没变化就不写
```

---

### Step 15. 升级为原子写（先写 `.tmp` 再 `rename`）

避免 Vite HMR 在文件写一半时读到。

```ts
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

export function writeIfChanged(path: string, content: string): boolean {
  try {
    if (readFileSync(path, 'utf8') === content) return false;
  } catch {
    /* noop */
  }
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
  return true;
}
```

✓ 验证：再跑一次 `dev-run.mjs`，行为不变。

---

### Step 16. 给 fixture 一个自己的 `tsconfig.json`

新建 `__tests__/fixtures/basic/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

同时在 fixture 的 `en-US/` 下补一个对应文件（保持 contracts 一致）：

```bash
mkdir -p __tests__/fixtures/basic/en-US
cat > __tests__/fixtures/basic/en-US/common.ts <<'EOF'
import type { CommonMessage } from '../base/common';
const common: CommonMessage = { hello: 'Hello' };
export default common;
EOF
cat > __tests__/fixtures/basic/en-US/user-management.ts <<'EOF'
import type { UserManagementMessage } from '../base/user-management';
const userManagement: UserManagementMessage = { title: 'User Management' };
export default userManagement;
EOF
```

✓ 验证：

```bash
cd __tests__/fixtures/basic && npx tsc --noEmit
# 零错误
cd ../../..
```

（如果你的主仓库 `tsconfig.json` 的 `exclude` 里还没有这个目录，记得加上 `"__tests__/fixtures"`，避免主仓库 tsc 被 fixture 代码干扰。）

---

### Step 17. 把 fixture 扩展到 3 × 3

为 M4 做准备，把实现层补全：

```bash
for locale in zh-CN zh-HK; do
  mkdir -p __tests__/fixtures/basic/$locale
  cat > __tests__/fixtures/basic/$locale/common.ts <<EOF
import type { CommonMessage } from '../base/common';
const common: CommonMessage = { hello: 'Hello' };
export default common;
EOF
  cat > __tests__/fixtures/basic/$locale/user-management.ts <<EOF
import type { UserManagementMessage } from '../base/user-management';
const userManagement: UserManagementMessage = { title: 'User Management' };
export default userManagement;
EOF
done
```

✓ 验证：

```bash
cd __tests__/fixtures/basic && npx tsc --noEmit
# 零错误
```

---

### 🏁 M3 单元测试：锁住 `writeIfChanged` 的行为

新建 `src/core/write.test.ts`：

```ts
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeIfChanged } from './write';

function tmpFile() {
  const dir = mkdtempSync(join(tmpdir(), 'i18next-kit-write-'));
  return join(dir, 'target.ts');
}

describe('writeIfChanged', () => {
  it('文件不存在时写入并返回 true', () => {
    const p = tmpFile();
    expect(writeIfChanged(p, 'hello')).toBe(true);
    expect(readFileSync(p, 'utf8')).toBe('hello');
  });

  it('内容一致时跳过并返回 false', () => {
    const p = tmpFile();
    writeFileSync(p, 'hello');
    expect(writeIfChanged(p, 'hello')).toBe(false);
  });

  it('内容变化时覆盖并返回 true', () => {
    const p = tmpFile();
    writeFileSync(p, 'hello');
    expect(writeIfChanged(p, 'world')).toBe(true);
    expect(readFileSync(p, 'utf8')).toBe('world');
  });
});
```

✓ 验证：`pnpm test` 全绿。

---

## 🏁 M4. 让 `tsc` 成为守门员

**这一轮结束时你拥有的东西**：生成的 `contracts.ts` 把每个 locale 的 namespace 都 `import`+`satisfies` 一遍。**你故意删任何一个 locale 文件 → `tsc` 立刻报错**。

这是整个 Phase 1 最有成就感的时刻，建议完成后截图留念。

---

### Step 18. 写 `scanLocalesFolder`

新建 `src/core/scan-locales-folder.ts`：

```ts
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

export function scanLocalesFolder(i18nDir: string, locales: string[]) {
  const result = [];
  for (const locale of locales) {
    const dir = join(i18nDir, locale);
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
      .map((f) => f.replace(/\.ts$/, ''));
    for (const namespace of files) {
      result.push({ locale, namespace });
    }
  }
  return result;
}
```

`src/core/index.ts` 补 export。

在 `dev-run.mjs` 里调一下看结果：

```js
import { scanLocalesFolder } from '../dist/core/index.js';
console.log(scanLocalesFolder(outDir, ['en-US', 'zh-CN', 'zh-HK']));
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# 应打印 6 项（3 locales × 2 namespaces）
```

---

### Step 19. 写 `emitContracts`

新建 `src/core/emit/contracts.ts`。产物最终应长这样：

```ts
/**
 * AUTO-GENERATED by i18next-kit — DO NOT EDIT.
 */
import type { CommonMessage } from './base/common';
import type { UserManagementMessage } from './base/user-management';

import enUSCommon from './en-US/common';
import enUSUserManagement from './en-US/user-management';
import zhCNCommon from './zh-CN/common';
/* ... */

type LocaleContract = {
  common: CommonMessage;
  'user-management': UserManagementMessage;
};

export const contracts = {
  'en-US': { common: enUSCommon, 'user-management': enUSUserManagement },
  'zh-CN': { /* ... */ },
  'zh-HK': { /* ... */ },
} satisfies Record<'en-US' | 'zh-CN' | 'zh-HK', LocaleContract>;
```

实现思路（建议自己敲一遍，不要直接拷）：

```ts
type Namespace = { name: string; typeName: string };
type LocaleFile = { locale: string; namespace: string };

function toCamelLocale(locale: string): string {
  // 'en-US' → 'enUS'
  return locale
    .split('-')
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join('');
}

function toPascal(name: string): string {
  return name
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function formatKey(name: string): string {
  return /^[a-zA-Z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

export function emitContracts(
  namespaces: Namespace[],
  localeFiles: LocaleFile[],
  locales: string[],
) {
  // imports type
  // imports value
  // LocaleContract type
  // contracts object
  // satisfies Record<...>
  // 拼出来 return 即可
}
```

把拼字符串拆成 5 段变量然后 join，可读性最好。

---

### Step 20. 把 `contracts.ts` 也生成出来

`dev-run.mjs` 里加：

```js
import { emitContracts } from '../dist/core/index.js';

const localeFiles = scanLocalesFolder(outDir, ['en-US', 'zh-CN', 'zh-HK']);
writeIfChanged(
  join(outDir, 'contracts.ts'),
  emitContracts(namespaces, localeFiles, ['en-US', 'zh-CN', 'zh-HK']),
);
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
ls __tests__/fixtures/basic/contracts.ts   # 存在

cd __tests__/fixtures/basic && npx tsc --noEmit
# 零错误
cd ../../..
```

---

### Step 21. 故意删一个 locale 文件，看 tsc 爆炸

```bash
rm __tests__/fixtures/basic/zh-CN/common.ts
cd __tests__/fixtures/basic && npx tsc --noEmit
# contracts.ts:xx:19 - error TS2307: Cannot find module './zh-CN/common'
cd ../../..
```

✓ 看到这个错误就成功了。契约兜底正式生效。

---

### Step 22. 恢复文件

```bash
cat > __tests__/fixtures/basic/zh-CN/common.ts <<'EOF'
import type { CommonMessage } from '../base/common';
const common: CommonMessage = { hello: 'Hello' };
export default common;
EOF

cd __tests__/fixtures/basic && npx tsc --noEmit   # 又绿了
cd ../../..
```

---

### 🏁 M4 单元测试：锁住 `scanLocalesFolder` 和 `emitContracts`

新建 `src/core/scan-locales-folder.test.ts` 和 `src/core/emit/contracts.test.ts`：

```ts
// scan-locales-folder.test.ts
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanLocalesFolder } from './scan-locales-folder';

describe('scanLocalesFolder', () => {
  it('遍历每个 locale 目录返回 (locale, namespace) 对', () => {
    const root = mkdtempSync(join(tmpdir(), 'i18n-'));
    for (const locale of ['en-US', 'zh-CN']) {
      mkdirSync(join(root, locale));
      writeFileSync(join(root, locale, 'common.ts'), '');
      writeFileSync(join(root, locale, 'file.ts'), '');
    }

    expect(scanLocalesFolder(root, ['en-US', 'zh-CN'])).toEqual(
      expect.arrayContaining([
        { locale: 'en-US', namespace: 'common' },
        { locale: 'en-US', namespace: 'file' },
        { locale: 'zh-CN', namespace: 'common' },
        { locale: 'zh-CN', namespace: 'file' },
      ]),
    );
  });
});
```

```ts
// emit/contracts.test.ts
import { describe, expect, it } from 'vitest';
import { emitContracts } from './contracts';

describe('emitContracts', () => {
  it('产物包含每个 (locale, namespace) 的 value import', () => {
    const out = emitContracts(
      [
        { name: 'common', typeName: 'CommonMessage' },
        { name: 'user-management', typeName: 'UserManagementMessage' },
      ],
      [
        { locale: 'en-US', namespace: 'common' },
        { locale: 'en-US', namespace: 'user-management' },
        { locale: 'zh-CN', namespace: 'common' },
        { locale: 'zh-CN', namespace: 'user-management' },
      ],
      ['en-US', 'zh-CN'],
    );

    expect(out).toContain(`import enUSCommon from './en-US/common';`);
    expect(out).toContain(`import zhCNUserManagement from './zh-CN/user-management';`);
    expect(out).toContain(`satisfies Record<'en-US' | 'zh-CN', LocaleContract>`);
    expect(out).toContain(`'user-management': UserManagementMessage`);
  });
});
```

✓ 验证：`pnpm test` 全绿。

---

## 🏁 M5. 让 `t('hello')` 有补全

**这一轮结束时你拥有的东西**：fixture 下能跑的 React 组件，IDE 对 `t('hello')` 有补全、对 `t('xxx')` 有红线。4 个核心产物齐全。

---

### Step 23. 写 `emitRuntime`（eager 版本）

新建 `src/core/emit/runtime.ts`，产物最终长这样：

```ts
/* AUTO-GENERATED ... */
import i18n, {
  type InitOptions,
  type Resource,
  type ResourceKey,
} from 'i18next';
import { initReactI18next } from 'react-i18next';
import { defaultNS, resourceNamespaces } from './generated-resources';

import './contracts';

const modules: Record<string, unknown> = import.meta.glob(
  './{en-US,zh-CN,zh-HK}/*.ts',
  { eager: true },
);

const resources: Resource = { 'en-US': {}, 'zh-CN': {}, 'zh-HK': {} };

for (const p in modules) {
  const match = p.match(/^\.\/(en-US|zh-CN|zh-HK)\/(.+)\.ts$/);
  if (!match) continue;
  const [, locale, ns] = match;
  const mod = modules[p] as { default: ResourceKey };
  (resources[locale] as Record<string, ResourceKey>)[ns] = mod.default;
}

export function initI18n(
  options?: Omit<InitOptions, 'resources' | 'defaultNS' | 'ns'>,
) {
  return i18n.use(initReactI18next).init({
    resources,
    defaultNS,
    ns: Object.keys(resourceNamespaces),
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
    ...options,
  });
}
```

动态部分（3 处）由 `locales` 数组拼：

- `./{en-US,zh-CN,zh-HK}/*.ts`
- `(en-US|zh-CN|zh-HK)` 正则
- `resources` 对象的初始 key

实现：

```ts
export function emitRuntime(locales: string[]) {
  const globPattern = `./{${locales.join(',')}}/*.ts`;
  const alternation = locales.join('|');
  const initialResources = locales
    .map((l) => `'${l}': {}`)
    .join(', ');
  // 拼出产物返回
}
```

---

### Step 24. 写 `emitDts`

新建 `src/core/emit/dts.ts`，内容几乎固定：

```ts
export function emitDts() {
  return `/**
 * AUTO-GENERATED by i18next-kit — DO NOT EDIT.
 */
import 'i18next';
import type { defaultNS, resourceNamespaces } from './generated-resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: typeof resourceNamespaces;
  }
}

export {};
`;
}
```

---

### Step 25. 串起来生成 4 个文件

`dev-run.mjs`：

```js
import {
  scanContracts,
  scanLocalesFolder,
  emitResources,
  emitContracts,
  emitRuntime,
  emitDts,
  writeIfChanged,
} from '../dist/core/index.js';

const outDir = './__tests__/fixtures/basic';
const locales = ['en-US', 'zh-CN', 'zh-HK'];
const namespaces = scanContracts(`${outDir}/base`);
const localeFiles = scanLocalesFolder(outDir, locales);

for (const [file, content] of [
  ['generated-resources.ts', emitResources(namespaces)],
  ['contracts.ts', emitContracts(namespaces, localeFiles, locales)],
  ['generated-runtime.ts', emitRuntime(locales)],
  ['i18next.d.ts', emitDts()],
]) {
  const changed = writeIfChanged(`${outDir}/${file}`, content);
  console.log(changed ? `✓ wrote ${file}` : `· skipped ${file}`);
}
```

✓ 验证：

```bash
pnpm build && node scripts/dev-run.mjs
# ✓ 4 个文件
cd __tests__/fixtures/basic && npx tsc --noEmit   # 零错误
cd ../../..
```

---

### Step 26. fixture 写一个假的 `App.tsx` 看 IDE 补全

```bash
cat > __tests__/fixtures/basic/App.tsx <<'EOF'
import { useTranslation } from 'react-i18next';
import './i18next';  // 让 declare module 生效

export function App() {
  const { t } = useTranslation('common');
  return <h1>{t('hello')}</h1>;
}
EOF
```

✓ 验证：
- 在 VSCode 打开 `App.tsx`
- 光标放 `t(` 后按 `Ctrl+Space` → 看到 `'hello'` 候选
- 改成 `t('xxx')` → 红线
- `useTranslation('invalid')` → 红线

---

### 🏁 M5 单元测试：锁住 `emitRuntime` 和 `emitDts`

新建 `src/core/emit/runtime.test.ts` 和 `src/core/emit/dts.test.ts`：

```ts
// runtime.test.ts
import { describe, expect, it } from 'vitest';
import { emitRuntime } from './runtime';

describe('emitRuntime', () => {
  it('glob pattern 包含所有 locale', () => {
    const out = emitRuntime(['en-US', 'zh-CN']);
    expect(out).toContain(`import.meta.glob(\n  './{en-US,zh-CN}/*.ts'`);
  });

  it('正则里的 alternation 覆盖所有 locale', () => {
    const out = emitRuntime(['en-US', 'zh-CN']);
    expect(out).toContain(`match(/^\\.\\/(en-US|zh-CN)\\/(.+)\\.ts$/)`);
  });

  it('resources 初始化对象包含每个 locale', () => {
    const out = emitRuntime(['en-US', 'zh-CN']);
    expect(out).toMatch(/const resources: Resource = \{\s*'en-US': \{\}, 'zh-CN': \{\}/);
  });
});
```

```ts
// dts.test.ts
import { describe, expect, it } from 'vitest';
import { emitDts } from './dts';

describe('emitDts', () => {
  it('产物包含 declare module 扩展', () => {
    const out = emitDts();
    expect(out).toContain(`declare module 'i18next'`);
    expect(out).toContain(`defaultNS: typeof defaultNS`);
    expect(out).toContain(`resources: typeof resourceNamespaces`);
  });
});
```

✓ 验证：`pnpm test` 全绿。

---

## 🏁 M6. 让错误说人话

**这一轮结束时你拥有的东西**：目录不存在、空目录、缺 locale 文件等场景会被清晰分类为"致命错误"和"校验警告"，终端有彩色输出。

---

### Step 27. 引入 `I18nextKitError`，让 `scanContracts` 在目录不存在时抛

在 `src/core/types.ts` 里（之前一直没用，现在第一次正式用上）：

```ts
export type I18nextKitErrorCode =
  | 'CONTRACTS_DIR_NOT_FOUND'
  | 'EMPTY_CONTRACTS'
  | 'LOCALE_DIR_NOT_FOUND'
  | 'INVALID_CONFIG';

export class I18nextKitError extends Error {
  constructor(
    public readonly code: I18nextKitErrorCode,
    message: string,
    public readonly detail?: Record<string, unknown>,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'I18nextKitError';
  }
}
```

`src/core/index.ts` 补 export。

修改 `scan-contracts.ts`：

```ts
import { existsSync } from 'node:fs';
import { I18nextKitError } from './types';

export function scanContracts(dir: string) {
  if (!existsSync(dir)) {
    throw new I18nextKitError(
      'CONTRACTS_DIR_NOT_FOUND',
      `契约目录不存在: ${dir}`,
      { dir },
    );
  }
  // ... 原有逻辑
}
```

✓ 验证：在 `dev-run.mjs` 里临时改个不存在的路径，应该看到：

```
I18nextKitError: [CONTRACTS_DIR_NOT_FOUND] 契约目录不存在: ./not-exists
```

---

### Step 28. `EMPTY_CONTRACTS` 错误

在 `scan-contracts.ts` 里：

```ts
const result = readdirSync(dir)
  .filter(/* ... */)
  .map(/* ... */);

if (result.length === 0) {
  throw new I18nextKitError(
    'EMPTY_CONTRACTS',
    `契约目录为空: ${dir}`,
    { dir },
  );
}

return result;
```

✓ 验证：临时清空 `base/` 试一下。

---

### Step 29. `LOCALE_DIR_NOT_FOUND` 错误

在 `scan-locales-folder.ts` 里加 `existsSync` 检查并抛 `LOCALE_DIR_NOT_FOUND`。

---

### Step 30. 写 `validate` + `dev-run.mjs` 用 picocolors 彩色打印

新建 `src/core/validate.ts`：

```ts
export type ValidationIssue = {
  code: 'MISSING_LOCALE_FILE' | 'EXTRA_LOCALE_FILE';
  locale: string;
  namespace: string;
};

export type ValidationReport = {
  ok: boolean;
  issues: ValidationIssue[];
};

type Namespace = { name: string };
type LocaleFile = { locale: string; namespace: string };

export function validate(
  namespaces: Namespace[],
  localeFiles: LocaleFile[],
  locales: string[],
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const have = new Set(localeFiles.map((f) => `${f.locale}::${f.namespace}`));
  const expected = new Set<string>();

  for (const l of locales) {
    for (const ns of namespaces) {
      const key = `${l}::${ns.name}`;
      expected.add(key);
      if (!have.has(key)) {
        issues.push({ code: 'MISSING_LOCALE_FILE', locale: l, namespace: ns.name });
      }
    }
  }

  for (const f of localeFiles) {
    const key = `${f.locale}::${f.namespace}`;
    if (!expected.has(key)) {
      issues.push({ code: 'EXTRA_LOCALE_FILE', ...f });
    }
  }

  return { ok: issues.length === 0, issues };
}
```

`dev-run.mjs` 包 try/catch + 彩色输出：

```js
import pc from 'picocolors';
import { I18nextKitError, validate } from '../dist/core/index.js';

try {
  // ...原有扫描逻辑
  const report = validate(namespaces, localeFiles, locales);
  if (!report.ok) {
    for (const issue of report.issues) {
      console.warn(pc.yellow(`⚠ [${issue.code}] ${issue.locale} × ${issue.namespace}`));
    }
  }
  // ...原有生成逻辑
} catch (err) {
  if (err instanceof I18nextKitError) {
    console.error(pc.red(`✗ ${err.message}`));
    process.exit(1);
  }
  throw err;
}
```

✓ 验证：
- 正常：无任何警告，4 个文件生成
- `rm __tests__/fixtures/basic/zh-CN/common.ts` → 黄色 warning，但文件照常生成
- `rm -rf __tests__/fixtures/basic/base` → 红色错误，退出 1
- 恢复：`git checkout __tests__/fixtures/basic`

---

### 🏁 M6 单元测试

新建 `src/core/validate.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { validate } from './validate';

describe('validate', () => {
  it('完美对齐时 ok=true, issues 为空', () => {
    const r = validate(
      [{ name: 'common' }],
      [{ locale: 'en-US', namespace: 'common' }],
      ['en-US'],
    );
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('缺 locale 文件 → MISSING_LOCALE_FILE', () => {
    const r = validate(
      [{ name: 'common' }, { name: 'file' }],
      [{ locale: 'en-US', namespace: 'common' }],
      ['en-US'],
    );
    expect(r.ok).toBe(false);
    expect(r.issues).toContainEqual({
      code: 'MISSING_LOCALE_FILE',
      locale: 'en-US',
      namespace: 'file',
    });
  });

  it('多余 locale 文件 → EXTRA_LOCALE_FILE', () => {
    const r = validate(
      [{ name: 'common' }],
      [
        { locale: 'en-US', namespace: 'common' },
        { locale: 'en-US', namespace: 'legacy' },
      ],
      ['en-US'],
    );
    expect(r.issues).toContainEqual({
      code: 'EXTRA_LOCALE_FILE',
      locale: 'en-US',
      namespace: 'legacy',
    });
  });
});
```

再补 `scan-contracts.test.ts` 两个 case：

```ts
it('目录不存在时抛 CONTRACTS_DIR_NOT_FOUND', () => {
  expect(() => scanContracts('/path/does/not/exist')).toThrow(I18nextKitError);
});

it('空目录时抛 EMPTY_CONTRACTS', () => {
  const dir = mkdtempSync(join(tmpdir(), 'empty-'));
  try {
    scanContracts(dir);
    expect.fail('应该抛错');
  } catch (e) {
    expect(e).toBeInstanceOf(I18nextKitError);
    expect((e as I18nextKitError).code).toBe('EMPTY_CONTRACTS');
  }
});
```

✓ 验证：`pnpm test` 全绿。

---

## 🏁 M7. 一键串起来 + 收官

**这一轮结束时你拥有的东西**：`generateAll(config)` 单一入口、`dev-run.mjs` 退化到 ≤ 15 行、单测覆盖率 ≥ 85%。

---

### Step 31. 定义用户面向的 `I18nextKitConfig`

在 `src/core/types.ts` 追加：

```ts
export interface I18nextKitConfig {
  root?: string;
  i18nDir?: string;
  contractsDir?: string;
  outDir?: string;
  locales: readonly string[];
  mode: 'folder' | 'file';
}

export interface ResolvedConfig {
  root: string;
  i18nDir: string;        // absolute
  contractsDir: string;   // absolute
  outDir: string;         // absolute
  locales: readonly string[];
  mode: 'folder' | 'file';
}
```

---

### Step 32. 写 `resolveConfig`

新建 `src/core/resolve-config.ts`：

```ts
import { isAbsolute, resolve } from 'node:path';
import { I18nextKitError } from './types';
import type { I18nextKitConfig, ResolvedConfig } from './types';

export function resolveConfig(config: I18nextKitConfig): ResolvedConfig {
  if (!Array.isArray(config.locales) || config.locales.length === 0) {
    throw new I18nextKitError(
      'INVALID_CONFIG',
      'locales 不能为空数组',
    );
  }
  if (config.mode !== 'folder' && config.mode !== 'file') {
    throw new I18nextKitError('INVALID_CONFIG', `未知 mode: ${config.mode}`);
  }
  if (config.mode === 'file') {
    throw new I18nextKitError(
      'INVALID_CONFIG',
      "mode: 'file' 暂未实现（Phase 3）",
    );
  }

  const root = config.root ? resolve(config.root) : process.cwd();
  const i18nDir = resolve(root, config.i18nDir ?? 'src/i18n');
  const contractsDir = isAbsolute(config.contractsDir ?? '')
    ? config.contractsDir!
    : resolve(i18nDir, config.contractsDir ?? 'base');
  const outDir = config.outDir ? resolve(root, config.outDir) : i18nDir;

  return { root, i18nDir, contractsDir, outDir, locales: config.locales, mode: config.mode };
}
```

---

### Step 33. 写 `generateAll`

新建 `src/core/orchestrate.ts`：

```ts
import { join } from 'node:path';
import { emitContracts } from './emit/contracts';
import { emitDts } from './emit/dts';
import { emitResources } from './emit/resources';
import { emitRuntime } from './emit/runtime';
import { resolveConfig } from './resolve-config';
import { scanContracts } from './scan-contracts';
import { scanLocalesFolder } from './scan-locales-folder';
import type { I18nextKitConfig } from './types';
import { validate, type ValidationReport } from './validate';
import { writeIfChanged } from './write';

export interface GenerateResult {
  writtenFiles: string[];
  validation: ValidationReport;
  durationMs: number;
}

export async function generateAll(
  userConfig: I18nextKitConfig,
): Promise<GenerateResult> {
  const start = performance.now();
  const config = resolveConfig(userConfig);

  const namespaces = scanContracts(config.contractsDir);
  const localeFiles = scanLocalesFolder(config.i18nDir, [...config.locales]);
  const validation = validate(namespaces, localeFiles, [...config.locales]);

  const written: string[] = [];
  const artifacts: [string, string][] = [
    ['generated-resources.ts', emitResources(namespaces)],
    ['contracts.ts', emitContracts(namespaces, localeFiles, [...config.locales])],
    ['generated-runtime.ts', emitRuntime([...config.locales])],
    ['i18next.d.ts', emitDts()],
  ];

  for (const [file, content] of artifacts) {
    const full = join(config.outDir, file);
    if (writeIfChanged(full, content)) written.push(full);
  }

  return {
    writtenFiles: written,
    validation,
    durationMs: performance.now() - start,
  };
}
```

`src/core/index.ts` 补 export。

---

### Step 34. 用 `tsx` 替代 build + dev-run，开发更顺滑

安装：

```bash
pnpm add -D tsx
```

改 `scripts/dev-run.mjs` → `scripts/dev-run.ts`，内容退化到极简：

```ts
import pc from 'picocolors';
import { generateAll, I18nextKitError } from '../src/core/index.js';

try {
  const result = await generateAll({
    root: process.cwd(),
    i18nDir: '__tests__/fixtures/basic',
    outDir: '__tests__/fixtures/basic',
    locales: ['en-US', 'zh-CN', 'zh-HK'],
    mode: 'folder',
  });

  for (const f of result.writtenFiles) {
    console.log(pc.green(`✓ ${f}`));
  }
  for (const i of result.validation.issues) {
    console.warn(pc.yellow(`⚠ [${i.code}] ${i.locale} × ${i.namespace}`));
  }
  console.log(pc.dim(`完成，用时 ${result.durationMs.toFixed(1)}ms`));
} catch (err) {
  if (err instanceof I18nextKitError) {
    console.error(pc.red(`✗ ${err.message}`));
    process.exit(1);
  }
  throw err;
}
```

在 `package.json` 加 script：

```json
"dev:run": "tsx scripts/dev-run.ts"
```

✓ 验证：

```bash
pnpm dev:run
# ✓ /abs/path/generated-resources.ts
# ✓ /abs/path/contracts.ts
# ✓ /abs/path/generated-runtime.ts
# ✓ /abs/path/i18next.d.ts
# 完成，用时 8.3ms

pnpm dev:run
# 第二次跑：没有 ✓ 打印（内容一致）
# 完成，用时 4.1ms
```

---

### Step 35. 补单测、拉覆盖率到 85%

新建 `src/core/resolve-config.test.ts` 和 `src/core/orchestrate.test.ts`：

```ts
// resolve-config.test.ts
describe('resolveConfig', () => {
  it('locales=[] 抛 INVALID_CONFIG', () => { /* ... */ });
  it('mode=file 抛 INVALID_CONFIG', () => { /* ... */ });
  it('相对 i18nDir 解析为绝对路径', () => { /* ... */ });
  it('outDir 缺省时回落到 i18nDir', () => { /* ... */ });
});

// orchestrate.test.ts
describe('generateAll', () => {
  it('端到端生成 4 个文件', async () => {
    const root = /* 用 tmp 建 fixture */;
    const result = await generateAll({
      root, i18nDir: '.', locales: ['en-US'], mode: 'folder',
    });
    expect(result.writtenFiles).toHaveLength(4);
  });

  it('第二次调用 writtenFiles 为空（幂等）', async () => {
    /* 连续调两次 */
  });

  it('validation.ok=false 时仍写产物', async () => {
    /* 故意少放一个 locale 文件 */
  });
});
```

跑覆盖率：

```bash
pnpm coverage
# 确保 core 目录 ≥ 85%
# 缺的 case 按报告补
```

---

### 🏁 M7 验收

| 状态 | 项 |
|:--:|---|
| ⬜ | `pnpm dev:run` 成功生成 4 个文件 |
| ⬜ | 第二次 `pnpm dev:run` 所有文件 skipped（幂等） |
| ⬜ | `__tests__/fixtures/basic` 下 `tsc --noEmit` 零错误 |
| ⬜ | `pnpm test` 全绿 |
| ⬜ | `pnpm coverage` core 覆盖率 ≥ 85% |
| ⬜ | `pnpm build` 后 `dist/core/index.js` 导出 `generateAll` |

---

## Phase 1 完成 🎉

此时 core 已是一个**稳定、可单测、行为锁死**的纯逻辑库。
下一步进入 Phase 2：把 `generateAll` 接到 Vite 插件和 CLI 上。

---

## 附录：`src/core/` 最终形态

```
src/core/
├── index.ts                    # public re-exports
├── types.ts                    # I18nextKitConfig / ResolvedConfig / I18nextKitError
├── resolve-config.ts           # resolveConfig()
├── scan-contracts.ts           # scanContracts()
├── scan-locales-folder.ts      # scanLocalesFolder()
├── validate.ts                 # validate()
├── write.ts                    # writeIfChanged()
├── orchestrate.ts              # generateAll()
├── scan-contracts.test.ts
├── scan-locales-folder.test.ts
├── validate.test.ts
├── resolve-config.test.ts
├── write.test.ts
├── orchestrate.test.ts
└── emit/
    ├── resources.ts
    ├── resources.test.ts
    ├── contracts.ts
    ├── contracts.test.ts
    ├── runtime.ts
    ├── runtime.test.ts
    ├── dts.ts
    └── dts.test.ts
```

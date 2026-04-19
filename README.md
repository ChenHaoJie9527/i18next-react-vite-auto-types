# i18next-react-vite-auto-types

一个使用 **Vite + TypeScript + Vitest** 搭建的 JavaScript 库模板，支持 ESM / CJS 双格式输出，并自动生成 `.d.ts` 类型声明。

## 技术栈

- [Vite](https://vitejs.dev/) `^8.0.8` — 库打包
- [TypeScript](https://www.typescriptlang.org/) `^6.0.3`
- [Vitest](https://vitest.dev/) `^4.1.4` — 单元测试
- [vite-plugin-dts](https://github.com/qmhc/vite-plugin-dts) — 自动生成类型声明
- [Ultracite](https://www.ultracite.ai/) + [Biome](https://biomejs.dev/) — 零配置 lint & format

## 环境要求

- Node.js `>= 20`

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（watch 构建）
npm run dev

# 代码校验（lint + format）
npm run check

# 自动修复可修复的问题
npm run fix

# 类型检查
npm run typecheck

# 运行测试
npm test

# 以 watch 模式运行测试
npm run test:watch

# 打开 Vitest UI
npm run test:ui

# 生成覆盖率报告
npm run coverage

# 生产构建
npm run build
```

## 项目结构

```
.
├── src/
│   ├── index.ts          # 库入口
│   └── index.test.ts     # 测试
├── dist/                 # 构建产物（ESM + CJS + d.ts）
├── tsconfig.json
├── vite.config.ts        # 构建 & 测试配置
└── package.json
```

## 产物说明

构建完成后，`dist/` 目录包含：

- `index.js` — ESM 产物
- `index.cjs` — CommonJS 产物
- `index.d.ts` — 通过 `vite-plugin-dts` 的 `rollupTypes` 合并生成的单文件类型声明
- 对应的 `.map` sourcemap 文件

`package.json` 的 `exports` 字段已按照现代双格式规范配置，支持 Node.js 与打包器自动解析。

## License

MIT

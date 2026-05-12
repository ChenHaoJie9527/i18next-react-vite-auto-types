import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import pc from "picocolors";
import { createServer, type ViteDevServer } from "vite";
import { i18nextKit } from "../src/plugin";

const root = resolve("__tests__/manual/v2-watch");
const i18nDir = join(root, "src", "i18n");
const appEntry = join(root, "src", "main.ts");
const indexHtml = join(root, "index.html");

function writeIfMissing(file: string, content: string) {
  if (existsSync(file)) {
    return;
  }
  writeFileSync(file, content, "utf-8");
}

function prepareManualWorkspace() {
  rmSync(root, { recursive: true, force: true });

  mkdirSync(join(i18nDir, "base"), { recursive: true });
  mkdirSync(join(i18nDir, "en-US"), { recursive: true });
  mkdirSync(join(i18nDir, "zh-CN"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });

  writeIfMissing(
    join(i18nDir, "base", "common.ts"),
    `export type CommonMessage = {
  title: string;
};
`
  );
  writeIfMissing(
    join(i18nDir, "en-US", "common.ts"),
    `import type { CommonMessage } from "../base/common";

export default {
  title: "Hello",
} satisfies CommonMessage;
`
  );
  writeIfMissing(
    join(i18nDir, "zh-CN", "common.ts"),
    `import type { CommonMessage } from "../base/common";

export default {
  title: "Hello zh-CN",
} satisfies CommonMessage;
`
  );
  writeIfMissing(
    appEntry,
    `console.log("i18next-kit manual v2 watcher is running");
`
  );
  writeIfMissing(
    indexHtml,
    `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>i18next-kit manual v2 watch</title>
  </head>
  <body>
    <div id="app">i18next-kit manual v2 watch</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
  );
}

async function main() {
  prepareManualWorkspace();

  const server: ViteDevServer = await createServer({
    configFile: false,
    root,
    logLevel: "info",
    plugins: [
      i18nextKit({
        root,
        i18nDir: "src/i18n",
        locales: ["en-US", "zh-CN"],
        mode: "folder",
        diagnostics: "info",
      }),
    ],
    server: {
      host: "127.0.0.1",
      port: 5179,
      strictPort: false,
    },
  });

  await server.listen();
  server.printUrls();

  console.log("");
  console.log(pc.cyan("Manual v2 watcher workspace:"));
  console.log(pc.green(root));
  console.log("");
  console.log(pc.cyan("Try editing these files while this process is running:"));
  console.log(pc.gray(`- ${join(i18nDir, "base", "common.ts")}`));
  console.log(pc.gray(`- ${join(i18nDir, "base", "user.ts")}`));
  console.log("");
  console.log(pc.cyan("Expected generated/synced files:"));
  console.log(pc.gray(`- ${join(i18nDir, "en-US", "<namespace>.ts")}`));
  console.log(pc.gray(`- ${join(i18nDir, "zh-CN", "<namespace>.ts")}`));
  console.log(pc.gray(`- ${join(i18nDir, "contracts.ts")}`));
  console.log(pc.gray(`- ${join(i18nDir, "generated-resources.ts")}`));
  console.log("");
  console.log(pc.yellow("Press Ctrl+C to stop. The workspace is left on disk."));

  const close = async () => {
    await server.close();
    process.exit(0);
  };

  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

await main();

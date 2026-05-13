import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../core/types";
import { syncOneBaseFile } from "../lib/sync-one-base-file";

describe("syncOneBaseFile", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  function createConfig(): ResolvedConfig {
    root = join(tmpdir(), `sync-one-base-file-${Date.now()}`);

    return {
      contractsDir: join(root, "contracts"),
      framework: "vite",
      i18nDir: join(root, "i18n"),
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      outDir: join(root, "out"),
      root,
    };
  }

  it("syncs a base file into each locale", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "user-management.ts");
    const expectedFiles = [
      join(config.i18nDir, "en-US", "user-management.ts"),
      join(config.i18nDir, "zh-CN", "user-management.ts"),
    ];
    const expectedContent = `import type { UserManagementMessage } from "../base/user-management";

export default {} satisfies UserManagementMessage;
`;

    const result = syncOneBaseFile(config, baseFile);

    expect(result).toEqual(expectedFiles);

    for (const file of expectedFiles) {
      expect(readFileSync(file, "utf-8")).toBe(expectedContent);
    }
  });

  it("does not rewrite unchanged locale files", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "common.ts");

    syncOneBaseFile(config, baseFile);

    expect(syncOneBaseFile(config, baseFile)).toEqual([]);
  });

  it("fills required string keys inferred from the base type", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "common.ts");
    mkdirSync(dirname(baseFile), { recursive: true });
    writeFileSync(
      baseFile,
      `export type CommonMessage = {
  title: string;
};`
    );

    syncOneBaseFile(config, baseFile);

    expect(
      readFileSync(join(config.i18nDir, "en-US", "common.ts"), "utf-8")
    ).toBe(`import type { CommonMessage } from "../base/common";

export default {
  "title": "",
} satisfies CommonMessage;
`);
  });

  it("fills typed text and rich message placeholders inferred from the base type", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "common.ts");
    mkdirSync(dirname(baseFile), { recursive: true });
    writeFileSync(
      baseFile,
      `import type { I18nRich, I18nText } from "i18next-kit";

export type CommonMessage = {
  title: I18nText;
  greeting: I18nText<{ name: string }>;
  richTitle: I18nRich<{ name: string }, { strong: unknown }>;
};`
    );

    syncOneBaseFile(config, baseFile);

    expect(
      readFileSync(join(config.i18nDir, "en-US", "common.ts"), "utf-8")
    ).toBe(`import type { CommonMessage } from "../base/common";

export default {
  "title": "",
  "greeting": "{{name}}",
  "richTitle": "<strong>{{name}}</strong>",
} satisfies CommonMessage;
`);
  });

  it("keeps existing locale values when base keys are synced again", () => {
    const config = createConfig();
    const baseFile = join(config.contractsDir, "base", "common.ts");
    const localeFile = join(config.i18nDir, "en-US", "common.ts");
    mkdirSync(dirname(baseFile), { recursive: true });
    mkdirSync(dirname(localeFile), { recursive: true });
    writeFileSync(
      baseFile,
      `export type CommonMessage = {
  title: string;
  copy: string;
};`
    );
    writeFileSync(
      localeFile,
      `import type { CommonMessage } from "../base/common";

export default {
  "title": "Hello",
  "copy": "Copy text",
} satisfies CommonMessage;
`
    );

    syncOneBaseFile(config, baseFile);

    expect(
      readFileSync(localeFile, "utf-8")
    ).toBe(`import type { CommonMessage } from "../base/common";

export default {
  "title": "Hello",
  "copy": "Copy text",
} satisfies CommonMessage;
`);
  });

  it("ignores non-ts base files", () => {
    const config = createConfig();

    const notValidFile = join(config.contractsDir, "base", "types.d.ts");
    const result = syncOneBaseFile(config, notValidFile);
    expect(result).toBeUndefined();
    expect(existsSync(config.i18nDir)).toBe(false);
  });
});

import { join } from "node:path";
import {
  emitResoureces,
  scanContracts,
  writeIfChanged,
} from "../dist/core/index.cjs";

const BASE = "base";
const outDir = "./__tests__/fixtures/basic";
const namespaces = scanContracts(join(outDir, BASE));
const content = emitResoureces(namespaces);

const changed = writeIfChanged(join(outDir, "generated-resources.ts"), content);

console.log(
  changed ? "✓ wrote generated-resources.ts" : "· skipped (no change)"
);

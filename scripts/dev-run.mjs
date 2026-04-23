import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { emitResoureces, scanContracts } from "../dist/core/index.cjs";

const BASE = "base";
const outDir = "./__tests__/fixtures/basic";
const namespaces = scanContracts(join(outDir, BASE));
const content = emitResoureces(namespaces);
writeFileSync(join(outDir, "generated-resources.ts"), content);
console.log("✓ wrote generated-resources.ts");

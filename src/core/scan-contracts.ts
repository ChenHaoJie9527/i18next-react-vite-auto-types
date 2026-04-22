import { readdirSync } from "node:fs";

export function scanContracts(dir: string) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
    .map((file) => {
      const name = file.replace(".ts", "");
      return {
        name,
      };
    });
}

import { readdirSync } from "node:fs";

export function scanContracts(dir: string) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
    .map((file) => {
      const name = file.replace(".ts", "");
      return {
        name,
        typeName: `${toPascalCase(name)}Message`,
      };
    });
}

/**
 * @description Convert a string to PascalCase.
 * @param name - The name to convert to PascalCase.
 */
function toPascalCase(name: string) {
  const parts = name.split("-");
  const result = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return result;
}

import { readdirSync } from "node:fs";

/**
 * Scan a contracts directory and infer namespace metadata from `*.ts` files.
 *
 * Each source file name becomes a namespace name, and the expected exported
 * message type is derived from the file name. For example, `user-management.ts`
 * becomes `{ name: "user-management", typeName: "UserManagementMessage" }`.
 *
 * @param dir - Directory containing base contract files.
 * @returns Namespace metadata used by the code generators.
 */
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
 * Convert a kebab-case namespace name to PascalCase.
 *
 * @param name - The name to convert to PascalCase.
 * @returns Pascal-cased text.
 */
function toPascalCase(name: string) {
  const parts = name.split("-");
  const result = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return result;
}

import { existsSync, readdirSync } from "node:fs";
import { I18nextKitError } from "./types";

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
  const isContractsDir = existsSync(dir);
  if (!isContractsDir) {
    throw new I18nextKitError(
      "CONTRACTS_DIR_NOT_FOUND",
      `契约目录不存在：${dir}`,
      { dir }
    );
  }

  const result = readdirSync(dir)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".d.ts"))
    .map((file) => {
      const name = file.replace(".ts", "");
      return {
        name,
        typeName: `${toPascalCase(name)}Message`,
      };
    });

  if (result.length === 0) {
    throw new I18nextKitError("EMPTY_CONTRACTS", `契约目录为空：${dir}`, {
      dir,
    });
  }

  return result;
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

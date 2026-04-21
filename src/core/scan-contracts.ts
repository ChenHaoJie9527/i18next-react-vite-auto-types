import { readdirSync } from "node:fs";

export function scanContracts(dir: string) {
  return readdirSync(dir);
}

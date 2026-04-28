export function emitRuntime(locales: string[]) {
  const globPattern = `./{${locales.join(",")}}/*.ts`;
  return globPattern;
}

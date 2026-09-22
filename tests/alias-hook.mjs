import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function withTsExtension(base) {
  if (existsSync(`${base}.ts`)) return `${base}.ts`;
  if (existsSync(`${base}.tsx`)) return `${base}.tsx`;
  if (existsSync(`${base}.mjs`)) return `${base}.mjs`;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = join(root, "src", specifier.slice(2));
    const file = withTsExtension(base) ?? base;
    return nextResolve(pathToFileURL(file).href, context);
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.(?:ts|tsx|js|mjs|json)$/.test(specifier) &&
    context.parentURL
  ) {
    const file = withTsExtension(join(dirname(fileURLToPath(context.parentURL)), specifier));
    if (file) return nextResolve(pathToFileURL(file).href, context);
  }
  return nextResolve(specifier, context);
}

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    clear() { map.clear(); }
  };
}

export function loadApp(options = {}) {
  const context = {
    console,
    setTimeout,
    clearTimeout,
    fetch: globalThis.fetch ? globalThis.fetch.bind(globalThis) : undefined,
    AbortController,
    URL,
    URLSearchParams,
    localStorage: memoryStorage()
  };
  context.window = context;
  vm.createContext(context);

  const files = ["isbn", "ddc", "genre", "storage"];
  if (options.withApi) files.push("api");

  for (const name of files) {
    const file = path.join(root, "js", name + ".js");
    vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: "js/" + name + ".js" });
  }

  return context;
}

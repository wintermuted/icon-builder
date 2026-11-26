import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { environmentRegistryArgs } from "./npm-registry.mjs";

const root = process.cwd();
const previewRequire = createRequire(join(root, "packages", "preview-app", "package.json"));

// The preview page loads @wintermuted/ui-theme straight from node_modules,
// so a missing install shows up as an unthemed page rather than an obvious error.
const REQUIRED_PATHS = [
  "node_modules",
  join("node_modules", ".bin", process.platform === "win32" ? "nx.cmd" : "nx"),
  join("node_modules", "@wintermuted", "ui-theme", "index.css"),
];

function missingDependencies() {
  const missing = REQUIRED_PATHS.filter((p) => !existsSync(join(root, p)));
  for (const name of [
    "vite",
    "react-dom/client",
    "@vitejs/plugin-react",
    "@wm-asset-workflows/ui-components",
  ]) {
    try {
      previewRequire.resolve(name);
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
      missing.push(name);
    }
  }
  return missing;
}
const missing = missingDependencies();
if (missing.length === 0) process.exit(0);

console.log(`[ensure-deps] missing ${missing.join(", ")} — running npm install`);

const result = spawnSync(
  "npm",
  ["install", "--no-audit", "--no-fund", ...environmentRegistryArgs()],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.status !== 0) {
  console.error("[ensure-deps] npm install failed; preview styling will be broken.");
  process.exit(result.status ?? 1);
}

const stillMissing = missingDependencies();
if (stillMissing.length > 0) {
  console.error(`[ensure-deps] still missing after install: ${stillMissing.join(", ")}`);
  process.exit(1);
}

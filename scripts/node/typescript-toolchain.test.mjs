import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { delimiter, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../", import.meta.url));

function compilerVersion(binary) {
  return execSync(`${binary} --version`, {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${join(root, "node_modules", ".bin")}${delimiter}${process.env.PATH ?? ""}`,
    },
    encoding: "utf8",
  }).trim();
}

test("native TypeScript supplies tsc without conflicting with the API compiler", () => {
  assert.match(compilerVersion("tsc"), /^Version 7\./);
  assert.match(compilerVersion("tsc6"), /^Version 6\./);
});

test("Nx's TypeScript dependency retains the compiler API", () => {
  const requireFromNx = createRequire(require.resolve("@nx/js"));
  const ts = requireFromNx("typescript");
  assert.match(ts.version, /^6\./);
  const source = ts.createSourceFile(
    "compiler-api-smoke.ts",
    "export const message: string = 'compiler API available';",
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  assert.deepEqual(source.parseDiagnostics, []);
  assert.ok(ts.isVariableStatement(source.statements[0]));
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = (await readFile(new URL("./ensure-deps.mjs", import.meta.url), "utf8")).replace(
  /^import .*;\r?\n/gm,
  "",
);

function checkDependencies({ linked = false, installLinks = true, installStatus = 0 } = {}) {
  const installs = [];
  const messages = [];
  let exitCode = 0;
  const exit = {};
  try {
    runInNewContext(source, {
      join,
      existsSync: () => true,
      createRequire: () => ({
        resolve(name) {
          if (name === "@wm-asset-workflows/ui-components" && !linked) {
            throw Object.assign(new Error("Workspace link missing"), { code: "MODULE_NOT_FOUND" });
          }
          return name;
        },
      }),
      process: {
        cwd: () => "fixture",
        platform: "win32",
        exit(code) {
          exitCode = code;
          throw exit;
        },
      },
      console: {
        log: (message) => messages.push(message),
        error: (message) => messages.push(message),
      },
      environmentRegistryArgs: () => [],
      spawnSync(command, args) {
        installs.push({ command, args });
        if (installLinks) linked = true;
        return { status: installStatus };
      },
    });
  } catch (error) {
    if (error !== exit) throw error;
  }
  return { installs, messages, exitCode };
}

test("an existing install missing only the UI workspace link installs and rechecks dependencies", () => {
  const result = checkDependencies();
  assert.equal(result.exitCode, 0);
  assert.equal(result.installs.length, 1);
  assert.equal(result.installs[0].command, "npm");
  assert.equal(result.installs[0].args[0], "install");
  assert.match(result.messages[0], /missing @wm-asset-workflows\/ui-components/);
});

test("an existing UI workspace link skips installation", () => {
  const result = checkDependencies({ linked: true });
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.installs, []);
});

test("startup fails explicitly if installation does not restore the UI workspace link", () => {
  const result = checkDependencies({ installLinks: false });
  assert.equal(result.exitCode, 1);
  assert.match(
    result.messages.at(-1),
    /still missing after install: @wm-asset-workflows\/ui-components/,
  );
});

test("startup preserves a failed install's exit status", () => {
  const result = checkDependencies({ installStatus: 2 });
  assert.equal(result.exitCode, 2);
  assert.match(result.messages.at(-1), /npm install failed/);
});

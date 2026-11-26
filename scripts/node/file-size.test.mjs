import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const metadata = JSON.parse(await readFile("node_modules/oxlint/package.json", "utf8"));
const cli = resolve("node_modules/oxlint", metadata.bin.oxlint);
const config = resolve(".oxlintrc.json");
function lint(path) {
  const result = spawnSync(process.execPath, [cli, "--config", config, path], { encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}

for (const extension of ["js", "ts"]) {
  test(`Oxlint accepts 500 lines and rejects 501, counting blanks/comments in ${extension}`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "icon-builder-max-lines-"));
    try {
      const path = join(dir, `boundary.${extension}`);
      const lines = Array.from({ length: 500 }, (_, index) =>
        index % 2 === 0 ? "" : "// This comment counts toward the limit.",
      );
      await writeFile(path, lines.join("\n"));
      const allowed = lint(path);
      assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
      await writeFile(path, [...lines, "// The 501st line is not allowed."].join("\n"));
      const rejected = lint(path);
      assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
      assert.match(rejected.stdout + rejected.stderr, /max-lines|too many lines/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

test("the generated preview bundle remains excluded from the source line limit", () => {
  const result = lint(resolve("preview/app.js"));
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

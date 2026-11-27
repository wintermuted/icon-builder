import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { join, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { CanvasProvider } from "../../../.github/extensions/icon-builder/provider.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "canvas-provider-"));
  const app = join(directory, "packages", "preview-app");
  await mkdir(app, { recursive: true });
  await mkdir(join(directory, "node_modules"));
  await mkdir(join(directory, "manifests"));
  await mkdir(join(directory, "specs"));
  await mkdir(join(directory, "preview"));
  await writeFile(join(directory, "manifests", "assets.json"), '{"projects":[],"assets":[]}');
  await writeFile(join(app, "package.json"), '{"type":"module"}');
  await mkdir(join(app, "node_modules"));
  const require = createRequire(new URL("../package.json", import.meta.url));
  const viteRoot = fileURLToPath(
    new URL("./", pathToFileURL(require.resolve("vite/package.json"))),
  );
  await symlink(viteRoot, join(app, "node_modules", "vite"), "junction");
  const backend = join(root, "packages", "preview-app", "vite-backend.ts").replaceAll("\\", "/");
  await writeFile(
    join(app, "vite.config.ts"),
    `import { createPreviewBackend } from ${JSON.stringify(backend)}; export default { root: ${JSON.stringify(directory)}, plugins: [createPreviewBackend(${JSON.stringify(directory)}, true)] };`,
  );
  return directory;
}

test("provider isolates worktrees, serializes concurrent startup, and cleans up on last close", async () => {
  const firstRoot = await fixture();
  const secondRoot = await fixture();
  const first = new CanvasProvider(pathToFileURL(`${firstRoot}${sep}`));
  const second = new CanvasProvider(pathToFileURL(`${secondRoot}${sep}`));
  const duplicate = new CanvasProvider(pathToFileURL(`${firstRoot}${sep}`));
  try {
    const [one, two, separate] = await Promise.all([
      first.request("open", { instanceId: "one" }),
      first.request("open", { instanceId: "two" }),
      second.request("open", { instanceId: "separate" }),
    ]);
    assert.equal(new URL(one.url).port, new URL(two.url).port);
    assert.notEqual(new URL(one.url).port, new URL(separate.url).port);
    assert.equal(first.instances, 2);
    await assert.rejects(
      duplicate.request("list_projects", {}),
      /already has an Icon Builder canvas provider/,
    );
    assert.deepEqual(await first.request("list_projects", {}), { projects: [] });
    await first.request("close", { instanceId: "one" });
    assert.equal(first.instances, 1);
    await first.request("close", { instanceId: "two" });
    assert.equal(first.instances, 0);
    await first.stop();
    await assert.rejects(fetch(one.url));
    const reopened = await first.request("open", { instanceId: "one" });
    assert.match(reopened.url, /\/preview\/index\.html\?canvas=1/);
  } finally {
    await Promise.all([first.stop(), second.stop(), duplicate.stop()]);
    await rm(firstRoot, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
  }
});

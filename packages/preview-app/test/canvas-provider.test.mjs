import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { CanvasProvider } from "../../../.github/extensions/icon-builder/provider.mjs";
import { acquireWorktreeLock } from "../../../.github/extensions/icon-builder/worktree-lock.mjs";

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

test("concurrent stale-lock recovery admits only one owner", async () => {
  const directory = await mkdtemp(join(tmpdir(), "canvas-ownership-"));
  let release;
  try {
    await mkdir(join(directory, "node_modules"));
    const dead = spawn(process.execPath, ["-e", ""]);
    await new Promise((resolve, reject) => {
      dead.once("exit", resolve);
      dead.once("error", reject);
    });
    const path = join(directory, "node_modules", ".icon-builder-canvas.lock");
    await writeFile(path, String(dead.pid));
    const results = await Promise.allSettled([
      acquireWorktreeLock(directory),
      acquireWorktreeLock(directory),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    release = results.find((result) => result.status === "fulfilled").value;
    assert.equal(await readFile(path, "utf8"), String(process.pid));
    await assert.rejects(
      acquireWorktreeLock(directory),
      /already has an Icon Builder canvas provider/,
    );
    assert.equal(await readFile(path, "utf8"), String(process.pid));
  } finally {
    await release?.();
    await rm(directory, { recursive: true, force: true });
  }
});

test("panel open/close and explicit stop are serialized through shutdown", async () => {
  const directory = await fixture();
  const provider = new CanvasProvider(pathToFileURL(`${directory}${sep}`));
  try {
    await provider.request("open", { instanceId: "first" });
    const [opened] = await Promise.all([
      provider.request("open", { instanceId: "pending" }),
      provider.request("close", { instanceId: "first" }),
    ]);
    assert.equal(provider.instances, 1);
    assert.deepEqual(await provider.request("list_projects", {}), { projects: [] });
    const [, fresh] = await Promise.all([
      provider.request("close", { instanceId: "pending" }),
      provider.request("open", { instanceId: "fresh" }),
    ]);
    assert.equal(provider.instances, 1);
    assert.notEqual(new URL(fresh.url).search, new URL(opened.url).search);
    const oldChild = provider.child;
    const [, restarted] = await Promise.all([
      provider.stop(),
      provider.request("open", { instanceId: "restarted" }),
    ]);
    assert.notEqual(provider.child.pid, oldChild.pid);
    assert.match(restarted.url, /\/preview\/index\.html\?canvas=1/);
    assert.deepEqual(await provider.request("list_projects", {}), { projects: [] });
  } finally {
    await provider.stop();
    await rm(directory, { recursive: true, force: true });
  }
});

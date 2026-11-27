import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { EventEmitter } from "node:events";

let vite, CanvasService, root, service, cache;
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="8" height="8"/></svg>\n';
before(async () => {
  cache = await mkdtemp(join(tmpdir(), "canvas-service-cache-"));
  vite = await createServer({
    cacheDir: cache,
    root: fileURLToPath(new URL("../../../", import.meta.url)),
    configFile: false,
    server: { middlewareMode: true, hmr: false },
  });
  ({ CanvasService } = await vite.ssrLoadModule("/packages/preview-server/src/canvas-service.ts"));
});
after(async () => {
  await vite?.close();
  if (cache) await rm(cache, { recursive: true, force: true });
});

async function fixture(work) {
  root = await mkdtemp(join(tmpdir(), "icon-builder-canvas-"));
  await mkdir(join(root, "assets", "svg", "fixture"), { recursive: true });
  await mkdir(join(root, "manifests"));
  await writeFile(join(root, "assets", "svg", "fixture", "mark.svg"), svg);
  await writeFile(
    join(root, "manifests", "assets.json"),
    JSON.stringify({
      projects: [{ name: "Fixture", slug: "fixture" }],
      assets: [{ id: "mark", source: "assets/svg/fixture/mark.svg", project: "Fixture" }],
    }),
  );
  service = new CanvasService(root);
  service.origin = "http://127.0.0.1:1234";
  try {
    await work();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function connect(token, clean = true) {
  const stream = new EventEmitter();
  stream.writeHead = () => {};
  stream.end = () => stream.emit("close");
  stream.write = (text) => {
    if (!text.startsWith("data:")) return;
    const event = JSON.parse(text.slice(6));
    if (event.type === "prepare")
      queueMicrotask(() => service.acknowledge(token, { id: event.id, clean }));
  };
  service.connect(token, stream);
  return stream;
}

test("catalog, revisions, safe saves, creation and duplicate rejection", () =>
  fixture(async () => {
    const read = await service.invoke("read_asset", { id: "mark" });
    assert.equal(read.svg, svg);
    const saved = await service.invoke("save_asset", {
      id: "mark",
      svg: svg.replace('width="8"', 'width="9"'),
      expectedRevision: read.revision,
    });
    assert.notEqual(saved.revision, read.revision);
    await assert.rejects(
      service.invoke("save_asset", { id: "mark", svg, expectedRevision: read.revision }),
      { code: "revision_conflict" },
    );
    await assert.rejects(
      service.invoke("save_asset", {
        id: "mark",
        svg: "<svg><script>alert(1)</script></svg>",
        expectedRevision: saved.revision,
      }),
      { code: "invalid_svg" },
    );
    for (const invalid of [
      "<svg><rect></svg>",
      '<svg xmlns="https://example.com"/>',
      '<svg><image href="https://example.com/image.png"/></svg>',
      '<svg><rect onload="alert(1)"/></svg>',
    ])
      await assert.rejects(
        service.invoke("save_asset", {
          id: "mark",
          svg: invalid,
          expectedRevision: saved.revision,
        }),
        { code: "invalid_svg" },
      );
    await service.invoke("create_project", { name: "New Project", slug: "new-project" });
    await assert.rejects(
      service.invoke("create_project", { name: "Duplicate", slug: "new-project" }),
      { code: "duplicate_project" },
    );
    const input = {
      id: "new-mark",
      project: "New Project",
      label: "New mark",
      svg,
      variants: [{ size: 64, theme: "dark" }],
    };
    await service.invoke("create_asset", input);
    await assert.rejects(service.invoke("create_asset", input), { code: "duplicate_asset" });
    assert.equal(
      (await service.invoke("list_assets", { project: "New Project" })).assets.length,
      1,
    );
    assert.equal(
      await readFile(join(root, "assets", "svg", "new-project", "new-mark.svg"), "utf8"),
      svg,
    );
    await assert.rejects(service.invoke("create_project", { name: "Escape", slug: "../escape" }), {
      code: "invalid_id",
    });
  }));

test("dirty or disconnected panels block agent writes, clean panels permit them", () =>
  fixture(async () => {
    const opened = await service.invoke("open", { instanceId: "one", assetId: "mark" });
    const token = new URL(opened.url).searchParams.get("panel");
    assert.match(opened.url, /#asset\/mark$/);
    const input = { name: "New", slug: "new" };
    await assert.rejects(service.invoke("create_project", input), { code: "editor_busy" });
    const dirty = connect(token, false);
    await assert.rejects(service.invoke("create_project", input), { code: "editor_busy" });
    dirty.end();
    const clean = connect(token);
    await service.invoke("create_project", input);
    clean.end();
    await assert.rejects(service.invoke("create_project", { name: "Another", slug: "another" }), {
      code: "editor_busy",
    });
    await service.invoke("close", { instanceId: "one" });
    await service.invoke("create_project", { name: "Another", slug: "another" });
  }));

test("drafts survive service recreation and protect unopened assets", () =>
  fixture(async () => {
    const read = await service.files.read("mark");
    await service.draft({ id: "mark", svg, revision: read.revision });
    service = new CanvasService(root);
    assert.equal((await service.readDraft("mark")).svg, svg);
    await assert.rejects(
      service.invoke("save_asset", { id: "mark", svg, expectedRevision: read.revision }),
      { code: "unsaved_draft" },
    );
    await service.draft({ id: "mark", discard: true });
    await service.invoke("save_asset", { id: "mark", svg, expectedRevision: read.revision });
  }));

test("concurrent catalog writes preserve both assets and symlink targets are rejected", () =>
  fixture(async () => {
    await Promise.all(
      ["first", "second"].map((id) =>
        service.invoke("create_asset", {
          id,
          project: "Fixture",
          label: id,
          svg,
          variants: [{ size: 32, theme: "light" }],
        }),
      ),
    );
    assert.equal((await service.invoke("list_assets", {})).assets.length, 3);
    const outside = await mkdtemp(join(tmpdir(), "canvas-outside-"));
    try {
      await symlink(outside, join(root, "assets", "svg", "linked"), "junction");
      const manifest = JSON.parse(await readFile(join(root, "manifests", "assets.json"), "utf8"));
      manifest.projects.push({ name: "Linked", slug: "linked" });
      await writeFile(join(root, "manifests", "assets.json"), JSON.stringify(manifest));
      await assert.rejects(
        service.invoke("create_asset", {
          id: "escape",
          project: "Linked",
          label: "Escape",
          svg,
          variants: [{ size: 32, theme: "light" }],
        }),
        { code: "invalid_path" },
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  }));

test("opening is idempotent, validates domain IDs, and prevents duplicate asset editors", () =>
  fixture(async () => {
    const first = await service.invoke("open", { instanceId: "one", project: "Fixture" });
    assert.deepEqual(
      await service.invoke("open", { instanceId: "one", project: "Fixture" }),
      first,
    );
    await assert.rejects(service.invoke("open", { instanceId: "bad", assetId: "missing" }), {
      code: "asset_not_found",
    });
    const second = await service.invoke("open", { instanceId: "two" });
    service.claim(new URL(first.url).searchParams.get("panel"), "mark");
    assert.throws(() => service.claim(new URL(second.url).searchParams.get("panel"), "mark"), {
      code: "asset_open",
    });
    await service.invoke("close", { instanceId: "one" });
    service.claim(new URL(second.url).searchParams.get("panel"), "mark");
  }));

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from "node:fs/promises";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { EventEmitter } from "node:events";

let vite, CanvasService, canvasHttp, createRequestHandler, root, service, cache;
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
  ({ canvasHttp } = await vite.ssrLoadModule("/packages/preview-server/src/canvas-http.ts"));
  ({ createRequestHandler } = await vite.ssrLoadModule("/packages/preview-server/src/routes.ts"));
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

function connect(token, clean = true, events = []) {
  const stream = new EventEmitter();
  stream.writeHead = () => {};
  stream.end = () => stream.emit("close");
  stream.write = (text) => {
    if (!text.startsWith("data:")) return;
    const event = JSON.parse(text.slice(6));
    events.push(event);
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

test("SVG validation rejects animated and presentation URL loads but retains local paint references", () =>
  fixture(async () => {
    const read = await service.files.read("mark");
    for (const content of [
      '<image href="#local"><animate attributeName="href" values="https://example.invalid/pixel"/></image>',
      '<image href="#local"><set attributeName="href" to="https://example.invalid/pixel"/></image>',
      '<animateMotion path="M0 0 L1 1"/>',
      '<animateTransform attributeName="transform" type="rotate" to="20"/>',
      '<rect cursor="url(https://example.invalid/cursor),auto"/>',
      "<rect fill=\"url('https://example.invalid/paint')\"/>",
      '<rect style="fill:u\\72l(https://example.invalid/paint)"/>',
    ])
      await assert.rejects(
        service.invoke("save_asset", {
          id: "mark",
          svg: `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`,
          expectedRevision: read.revision,
        }),
        { code: "invalid_svg" },
      );
    const safe =
      '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="local"/></defs><rect fill="url(\'#local\')" style="stroke:url( #local )"/></svg>';
    await service.invoke("save_asset", { id: "mark", svg: safe, expectedRevision: read.revision });
    assert.equal((await service.files.read("mark")).svg, `${safe}\n`);
  }));

test("catalog and deep links include asset-derived and unassigned projects", () =>
  fixture(async () => {
    const path = join(root, "manifests", "assets.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    manifest.assets.push({ id: "derived", project: "Conway's Game of Life" }, { id: "unassigned" });
    await writeFile(path, JSON.stringify(manifest));
    const projects = (await service.invoke("list_projects", {})).projects;
    assert.deepEqual(
      projects.map((project) => project.name),
      ["Fixture", "Conway's Game of Life", "Unassigned Project"],
    );
    for (const project of projects)
      assert.equal(
        new URL(
          (await service.invoke("open", { instanceId: project.name, project: project.name })).url,
        ).hash,
        `#project/${encodeURIComponent(project.name)}`,
      );
    assert.equal(
      (await service.invoke("list_assets", { project: "Unassigned Project" })).assets[0].id,
      "unassigned",
    );
  }));

async function httpFixture(work) {
  return fixture(async () => {
    const legacy = createRequestHandler({ root, reload: { suppressFor() {} } });
    const handler = canvasHttp(service, legacy);
    const server = createHttpServer((req, res) => void handler(req, res));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    service.origin = `http://127.0.0.1:${server.address().port}`;
    const { url } = await service.invoke("open", { instanceId: "http" });
    const token = new URL(url).searchParams.get("panel");
    const events = [];
    const stream = connect(token, true, events);
    const post = async (path, input) => {
      const response = await fetch(`${service.origin}${path}`, {
        method: "POST",
        headers: { "x-icon-canvas-token": token, "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return { status: response.status, data: await response.json() };
    };
    try {
      await work({ token, post, events });
    } finally {
      stream.end();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });
}

test("canvas scaffold rejects redirected directories and preserves the form response", () =>
  httpFixture(async ({ post, events }) => {
    const outside = await mkdtemp(join(tmpdir(), "canvas-scaffold-outside-"));
    try {
      await symlink(outside, join(root, "assets", "svg", "linked"), "junction");
      const blocked = await post("/~scaffold", { name: "Linked", slug: "linked" });
      assert.equal(blocked.status, 409);
      assert.deepEqual(await readdir(outside), []);
      assert.equal(events.at(-1).changed, false);
      const created = await post("/~scaffold", { name: "Created", slug: "created" });
      assert.equal(created.status, 200);
      assert.deepEqual(created.data, {
        ok: true,
        name: "Created",
        slug: "created",
        alreadyExists: false,
        svgDir: "assets/svg/created/",
        groundingDir: "assets/svg/created/grounding/",
        documentation: "assets/svg/created/README.md",
      });
      assert.equal(events.at(-1).changed, true);
      assert.equal(events.at(-1).requesting, true);
      assert.equal(events.at(-1).saving, false);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  }));

test("legacy mutation failures do not refresh panels and requesters are distinct from dirty savers", () =>
  httpFixture(async ({ post, events }) => {
    const failed = await post("/~project", { project: "Missing", name: "Renamed" });
    assert.equal(failed.status, 400);
    assert.equal(events.at(-1).changed, false);
    assert.equal(events.at(-1).requesting, true);
    assert.equal(events.at(-1).saving, false);
    const saved = await post("/~project-color", {
      project: "Fixture",
      color: "#112233",
      selected: true,
      custom: true,
    });
    assert.equal(saved.status, 200);
    assert.equal(events.at(-1).changed, true);
    assert.equal(events.at(-1).requesting, true);
  }));

test("HTTP saves preserve Unicode split across incoming buffer chunks", () =>
  httpFixture(async ({ token }) => {
    const current = await service.files.read("mark");
    const unicode = '<svg xmlns="http://www.w3.org/2000/svg"><text>🧭 日本語</text></svg>\n';
    const bytes = Buffer.from(
      JSON.stringify({ id: "mark", svg: unicode, expectedRevision: current.revision }),
    );
    const split = bytes.indexOf(Buffer.from("🧭")) + 1;
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest(
        `${service.origin}/~asset`,
        {
          method: "POST",
          headers: { "x-icon-canvas-token": token, "Content-Type": "application/json" },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
        },
      );
      req.on("error", reject);
      req.write(bytes.subarray(0, split));
      setTimeout(() => req.end(bytes.subarray(split)), 20);
    });
    assert.equal(response.status, 200);
    assert.equal((await service.files.read("mark")).svg, unicode);
  }));

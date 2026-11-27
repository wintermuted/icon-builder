import assert from "node:assert/strict";
import { before, after, beforeEach, afterEach, test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect id="first" x="20" y="20" width="50" height="50" fill="#112233"/></svg>\n';
let vite,
  service,
  browser,
  context,
  page,
  fixture,
  errors,
  number = 0;
let routeHandler;
const panels = [];

before(async () => {
  fixture = await mkdtemp(join(tmpdir(), "icon-builder-canvas-browser-"));
  await mkdir(join(fixture, "assets", "svg", "fixture"), { recursive: true });
  await mkdir(join(fixture, "manifests"));
  await mkdir(join(fixture, "preview"));
  await writeFile(join(fixture, "preview", "spec-index.json"), '{"diagrams":[]}');
  await writeFile(join(fixture, "assets", "svg", "fixture", "mark.svg"), svg);
  await writeFile(join(fixture, "assets", "svg", "fixture", "other.svg"), svg);
  await writeFile(
    join(fixture, "manifests", "assets.json"),
    JSON.stringify({
      projects: [{ name: "Fixture", slug: "fixture", primaryAssetId: "mark" }],
      assets: [
        {
          id: "mark",
          label: "Canvas fixture",
          project: "Fixture",
          source: "assets/svg/fixture/mark.svg",
          variants: [{ size: 64, theme: "light" }],
        },
        {
          id: "other",
          label: "Other fixture",
          project: "Fixture",
          source: "assets/svg/fixture/other.svg",
          variants: [{ size: 64, theme: "light" }],
        },
      ],
    }),
  );
  vite = await createServer({
    root,
    cacheDir: join(fixture, ".vite"),
    configFile: false,
    publicDir: false,
    plugins: [
      react(),
      {
        name: "canvas-fixture",
        configureServer(server) {
          server.middlewares.use((req, res, next) => routeHandler(req, res, next));
        },
      },
    ],
    server: { host: "127.0.0.1", port: 0, hmr: false },
  });
  const { CanvasService } = await vite.ssrLoadModule(
    "/packages/preview-server/src/canvas-service.ts",
  );
  const { canvasHttp } = await vite.ssrLoadModule("/packages/preview-server/src/canvas-http.ts");
  const { createRequestHandler } = await vite.ssrLoadModule(
    "/packages/preview-server/src/routes.ts",
  );
  service = new CanvasService(fixture);
  const legacy = createRequestHandler({ root: fixture, reload: { suppressFor() {} } });
  const handler = canvasHttp(service, legacy);
  routeHandler = (req, res, next) => {
    if (req.url.startsWith("/~")) void handler(req, res);
    else if (
      req.url.startsWith("/manifests/") ||
      req.url.startsWith("/assets/") ||
      req.url.startsWith("/preview/spec-index.json")
    )
      void legacy(req, res);
    else next();
  };
  await vite.listen();
  service.origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await vite?.close();
  if (fixture) await rm(fixture, { recursive: true, force: true });
});
beforeEach(async () => {
  for (const id of ["mark", "other"]) {
    await writeFile(join(fixture, "assets", "svg", "fixture", `${id}.svg`), svg);
    await service.draft({ id, discard: true });
  }
  context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  page = await context.newPage();
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.route("https://cdn.jsdelivr.net/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "window.mermaid={initialize(){}};" }),
  );
});
afterEach(async () => {
  await context?.close();
  for (const id of panels.splice(0)) await service.invoke("close", { instanceId: id });
  assert.deepEqual(errors, []);
});
async function open(assetId) {
  const id = `browser-${++number}`;
  panels.push(id);
  const { url } = await service.invoke("open", { instanceId: id, ...(assetId ? { assetId } : {}) });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.getElementById("root")?.inert === false);
  if (assetId) await page.locator("#asset-primary-svg svg").waitFor();
}
async function changedDraft() {
  await page.getByLabel("Select element 1", { exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() =>
    document
      .querySelector("#asset-primary-svg #first")
      ?.getAttribute("transform")
      ?.includes("translate"),
  );
  for (let attempt = 0; attempt < 50; attempt++) {
    const draft = await service.readDraft("mark");
    if (draft?.svg.includes("translate")) return draft;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail("Edited SVG was not persisted as a draft.");
}

test("compact narrow/wide presentation follows host tokens and preserves standalone chrome", async () => {
  await page.goto(`${service.origin}/preview/index.html#asset/mark`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#asset-primary-svg svg").waitFor();
  assert.equal(await page.locator(".app-footer").count(), 1);
  await mkdir(join(root, "outputs", "screenshots"), { recursive: true });
  await page.screenshot({
    path: join(root, "outputs", "screenshots", "canvas-before.png"),
    animations: "disabled",
  });
  await open("mark");
  await page.setViewportSize({ width: 480, height: 900 });
  assert.equal(await page.locator(".app-footer").count(), 0);
  assert.equal(await page.locator("#theme-toggle").count(), 0);
  assert.equal(await page.getByRole("button", { name: "Save", exact: true }).isVisible(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({
    path: join(root, "outputs", "screenshots", "canvas-after-light.png"),
    animations: "disabled",
  });
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--background-color-default", "#0d1117");
    document.documentElement.style.setProperty("--text-color-default", "#f0f6fc");
    document.documentElement.dataset.colorMode = "dark";
  });
  await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
  assert.equal(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--wm-color-bg").trim(),
    ),
    "#0d1117",
  );
  assert.equal(await page.evaluate(() => localStorage.getItem("wm-assets-theme")), null);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: join(root, "outputs", "screenshots", "canvas-after-dark.png"),
    animations: "disabled",
  });
});

test("dirty drafts block agent writes, survive reload, and can be saved before agent refresh", async () => {
  await open("mark");
  const original = await service.files.read("mark");
  const draft = await changedDraft();
  await assert.rejects(
    service.invoke("save_asset", { id: "mark", svg, expectedRevision: original.revision }),
    { code: "editor_busy" },
  );
  await page.reload();
  await page.locator("#asset-primary-svg #first[transform]").waitFor();
  assert.equal((await service.readDraft("mark")).svg, draft.svg);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#asset-save-button")?.disabled);
  for (let attempt = 0; attempt < 50 && (await service.readDraft("mark")); attempt++)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(await service.readDraft("mark"), null);
  const saved = await service.files.read("mark");
  assert.notEqual(saved.revision, original.revision);
  await service.invoke("save_asset", { id: "mark", svg, expectedRevision: saved.revision });
  await page.waitForFunction(
    () => !document.querySelector("#asset-primary-svg #first")?.hasAttribute("transform"),
  );
});

test("stale UI save preserves its draft until explicit discard", async () => {
  await open("mark");
  await changedDraft();
  await writeFile(
    join(fixture, "assets", "svg", "fixture", "mark.svg"),
    svg.replace('width="50"', 'width="55"'),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("SVG changed on disk.", { exact: false }).waitFor();
  assert.ok(await service.readDraft("mark"));
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await page.locator('#asset-primary-svg #first[width="55"]').waitFor();
  assert.equal(await service.readDraft("mark"), null);
});

test("canvas HTTP mutations require the panel token and matching origin", async () => {
  await open();
  const response = await fetch(`${service.origin}/~asset`, { method: "POST", body: "{}" });
  assert.equal(response.status, 403);
  const token = new URL(page.url()).searchParams.get("panel");
  const crossOrigin = await fetch(`${service.origin}/~asset`, {
    method: "POST",
    headers: { origin: "https://example.com", "x-icon-canvas-token": token },
    body: "{}",
  });
  assert.equal(crossOrigin.status, 403);
});

test("UI saves freeze before flushing drafts and stay frozen through release and bookkeeping", async () => {
  await open("mark");
  await changedDraft();
  const draftStarted = Promise.withResolvers();
  const draftGate = Promise.withResolvers();
  const saved = Promise.withResolvers();
  const saveGate = Promise.withResolvers();
  await page.route("**/~canvas/draft", async (route) => {
    draftStarted.resolve();
    await draftGate.promise;
    await route.continue();
  });
  await page.route("**/~asset", async (route) => {
    const response = await route.fetch();
    saved.resolve();
    await saveGate.promise;
    await route.fulfill({ response });
  });
  try {
    await page.keyboard.press("ArrowRight");
    await draftStarted.promise;
    await page.getByRole("button", { name: "Save", exact: true }).click();
    assert.equal(await page.locator("#root").evaluate((root) => root.inert), true);
    const captured = await page
      .locator("#asset-primary-svg svg")
      .evaluate((svg) => new XMLSerializer().serializeToString(svg));
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page
        .locator("#asset-primary-svg svg")
        .evaluate((svg) => new XMLSerializer().serializeToString(svg)),
      captured,
    );
    draftGate.resolve();
    await saved.promise;
    assert.equal(await page.locator("#root").evaluate((root) => root.inert), true);
    saveGate.resolve();
    await page.waitForFunction(() => !document.getElementById("root").inert);
    assert.equal(await page.locator("#asset-save-button").isDisabled(), true);
    assert.equal((await service.files.read("mark")).svg.trim(), captured);
    assert.equal(await service.readDraft("mark"), null);
  } finally {
    draftGate.resolve();
    saveGate.resolve();
  }
});

test("draft persistence coalesces rapid edits and skips unchanged snapshots before prepare", async () => {
  await open("mark");
  await changedDraft();
  const started = Promise.withResolvers();
  const gate = Promise.withResolvers();
  let writes = 0;
  await page.route("**/~canvas/draft", async (route) => {
    if (++writes === 1) {
      started.resolve();
      await gate.promise;
    }
    await route.continue();
  });
  try {
    await page.keyboard.press("ArrowRight");
    await started.promise;
    for (let index = 0; index < 12; index++) await page.keyboard.press("ArrowRight");
    await page.evaluate(() => {
      for (let index = 0; index < 20; index++) window.dispatchEvent(new Event("canvas-dirty"));
    });
    assert.equal(writes, 1);
    const latest = await page
      .locator("#asset-primary-svg svg")
      .evaluate((svg) => new XMLSerializer().serializeToString(svg));
    const blocked = assert.rejects(
      service.invoke("create_project", { name: "Blocked", slug: "blocked" }),
      { code: "editor_busy" },
    );
    gate.resolve();
    await blocked;
    assert.equal(writes, 2);
    assert.equal((await service.readDraft("mark")).svg, latest);
  } finally {
    gate.resolve();
  }
});

for (const destination of ["#logos", "#asset/other"]) {
  test(`obsolete asset preparation releases its claim before navigating to ${destination}`, async () => {
    await open();
    const started = Promise.withResolvers();
    const gate = Promise.withResolvers();
    await page.route(/\/~canvas\/asset\?id=mark$/, async (route) => {
      const response = await route.fetch();
      started.resolve();
      await gate.promise;
      await route.fulfill({ response });
    });
    try {
      await page.evaluate(() => {
        location.hash = "#asset/mark";
      });
      await started.promise;
      await page.evaluate((hash) => {
        location.hash = hash;
      }, destination);
      const released = page.waitForResponse((response) =>
        response.url().endsWith("/~canvas/release"),
      );
      gate.resolve();
      await released;
      const token = new URL(page.url()).searchParams.get("panel");
      if (destination === "#logos") {
        assert.equal(service.panel(token).assetId, undefined);
        assert.equal(await page.locator("#asset-primary-svg").count(), 0);
      } else {
        await page.locator('#asset-primary-svg[data-asset-id="other"] svg').waitFor();
        assert.equal(service.panel(token).assetId, "other");
        await page.getByLabel("Select element 1", { exact: true }).click();
        const preserved = page.waitForResponse((response) =>
          response.url().endsWith("/~canvas/draft"),
        );
        await page.keyboard.press("ArrowRight");
        await preserved;
        assert.match((await service.readDraft("other")).svg, /translate/);
        assert.equal(await service.readDraft("mark"), null);
      }
    } finally {
      gate.resolve();
    }
  });
}

test("disconnection keeps keyboard-accessible SVG recovery outside the inert editor", async () => {
  await open("mark");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: service.origin });
  await page.route("**/~canvas/draft", (route) => route.abort());
  await page.getByLabel("Select element 1", { exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await page.getByText("Draft could not be preserved:", { exact: false }).waitFor();
  const expected = await page
    .locator("#asset-primary-svg svg")
    .evaluate((svg) => new XMLSerializer().serializeToString(svg));
  await page.screenshot({
    path: join(root, "outputs", "screenshots", "canvas-recovery-before.png"),
  });
  await page.route("**/~canvas/events?*", (route) => route.abort());
  service.panel(new URL(page.url()).searchParams.get("panel")).stream.end();
  const recovery = page.getByRole("button", { name: "Copy recovery SVG", exact: true });
  await recovery.waitFor();
  assert.equal(await page.locator("#root").evaluate((root) => root.inert), true);
  await recovery.focus();
  await page.keyboard.press("Enter");
  await page.getByText("Copied the in-memory SVG.", { exact: false }).waitFor();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected);
  assert.equal(await service.readDraft("mark"), null);
  await page.screenshot({
    path: join(root, "outputs", "screenshots", "canvas-recovery-after.png"),
  });
});

test("canvas scaffolding retains its success prompt and failed renames retain their error", async () => {
  await open();
  await page.getByRole("button", { name: "New Project", exact: true }).click();
  await page.locator("#np-name").fill("Created by canvas");
  await page.getByRole("button", { name: "Create Project", exact: true }).click();
  await page.locator("#np-success-view").waitFor();
  assert.match(
    await page.locator("#np-prompt-snippet").textContent(),
    /Project: Created by canvas/,
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.locator("#project-detail-title").waitFor();
  await page.evaluate(() => {
    location.hash = "#project/Fixture";
  });
  await page.getByRole("heading", { name: "Fixture", exact: true }).waitFor();
  await page.getByRole("button", { name: "Rename project", exact: true }).click();
  await page.locator("#project-rename-input").fill("Created by canvas");
  await page.locator("#project-rename-form").evaluate((form) => form.requestSubmit());
  await page
    .getByText("A project named Created by canvas already exists", { exact: true })
    .waitFor();
  assert.equal(await page.locator("#project-rename-input").inputValue(), "Created by canvas");
});

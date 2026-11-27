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

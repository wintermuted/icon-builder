import assert from "node:assert/strict";
import { after, before, beforeEach, afterEach, test } from "node:test";
import { chromium } from "playwright";
import { startPreviewTestServer } from "./preview-test-server.mjs";

let server;
let browser;
let context;
let page;
let errors;
before(async () => {
  server = await startPreviewTestServer({ bundle: process.env.PREVIEW_TEST_BUNDLE === "1" });
  try {
    browser = await chromium.launch();
  } catch (error) {
    await server.close();
    throw error;
  }
});
after(async () => {
  await browser?.close();
  await server?.close();
});
beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://cdn.jsdelivr.net/**", (route) =>
    route.fulfill({
      body: "window.mermaid = { initialize() {}, async render() { return { svg: '<svg></svg>' }; } };",
      contentType: "text/javascript",
    }),
  );
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
});

const columns = (locator) =>
  locator.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);

test("shared headers and split layouts preserve direct hooks and exact collapse thresholds", async () => {
  await page.goto(`${server.url}/preview/index.html#project/Fixture%20Project`);
  await page.locator("#project-detail > header #project-detail-title").waitFor();
  assert.equal(
    await page.locator(".wm-app-frame > .wm-app-frame-body > main > #project-detail").count(),
    1,
  );
  const workspace = page.locator(".project-workspace");
  await page.setViewportSize({ width: 900, height: 1024 });
  assert.equal(await columns(workspace), 2);
  const widths = await workspace.evaluate((element) =>
    Array.from(element.children, (child) => child.getBoundingClientRect().width),
  );
  assert.ok(Math.abs(widths[0] / widths[1] - 0.9 / 1.1) < 0.01);
  await page.setViewportSize({ width: 899, height: 1024 });
  assert.equal(await columns(workspace), 1);
  await page.locator("#project-generate-new").click();
  const guidance = page.locator(".project-guidance-grid");
  await page.setViewportSize({ width: 681, height: 1024 });
  assert.equal(await columns(guidance), 2);
  await page.setViewportSize({ width: 680, height: 1024 });
  assert.equal(await columns(guidance), 1);
  await page.locator(".source-material-image-link").first().click();
  await page.locator("#source-detail-title").filter({ hasText: "Reference" }).waitFor();
  const reference = page.locator(".source-detail-layout");
  await page.setViewportSize({ width: 721, height: 1024 });
  assert.equal(await columns(reference), 2);
  await page.setViewportSize({ width: 720, height: 1024 });
  assert.equal(await columns(reference), 1);
});

test("native editor toggles and field controllers survive parent theme rerenders", async () => {
  await page.goto(`${server.url}/preview/index.html#asset/fixture`);
  await page.locator("#asset-primary-svg svg").waitFor();
  const compare = page.locator("#asset-preview-size-list-toggle");
  const grid = page.locator("#asset-size-grid");
  await compare.click();
  assert.equal(await compare.getAttribute("aria-pressed"), "true");
  assert.equal(await grid.isVisible(), true);
  await page.locator("#theme-toggle").click();
  assert.equal(await compare.getAttribute("aria-pressed"), "true");
  await compare.click();
  assert.equal(await compare.getAttribute("aria-pressed"), "false");
  assert.equal(await grid.isVisible(), false);
  const visibility = page.locator("#asset-grid-visibility-toggle");
  await visibility.click();
  assert.equal(await visibility.getAttribute("aria-pressed"), "true");
  await page.locator("#theme-toggle").click();
  await visibility.click();
  assert.equal(await visibility.getAttribute("aria-pressed"), "false");
  assert.equal(
    await page.getByLabel("Grid spacing in SVG units", { exact: true }).getAttribute("id"),
    "asset-grid-size-input",
  );
  await page.getByRole("button", { name: "Edit ViewBox", exact: true }).click();
  const width = page.getByLabel("ViewBox width", { exact: true });
  assert.equal(await width.getAttribute("id"), "asset-viewbox-width");
  await width.fill("260");
  await page.locator("#asset-viewbox-form button[type=submit]").click();
  assert.equal(await page.locator("#asset-primary-svg svg").getAttribute("viewBox"), "0 0 260 240");
});

test("shared form fields retain focus, accessible hints, and scaffold payloads", async () => {
  await page.goto(`${server.url}/preview/index.html#logos`);
  await page.locator("#new-project-btn").click();
  const name = page.getByRole("textbox", { name: "Project Name", exact: true });
  assert.equal(await name.evaluate((input) => input === document.activeElement), true);
  const slug = page.getByRole("textbox", { name: "Directory Slug", exact: true });
  const helpId = await slug.getAttribute("aria-describedby");
  assert.ok(helpId);
  assert.match(
    await page.locator(`[id="${helpId}"]`).textContent(),
    /Lowercase, numbers, hyphens only/,
  );
  await name.fill("New Project");
  await slug.fill("new-project");
  const count = server.requests.length;
  await page.locator("#np-form button[type=submit]").click();
  await page.locator("#np-success-view").waitFor();
  assert.deepEqual(
    server.requests.slice(count).find((request) => request.path === "/~scaffold").payload,
    { name: "New Project", slug: "new-project" },
  );
  const links = page.locator("#np-resource-list a");
  assert.equal(await links.count(), 4);
  assert.equal(await links.first().getAttribute("rel"), "noopener noreferrer");
  assert.equal(await page.locator(".wm-app-frame > footer").count(), 1);
});

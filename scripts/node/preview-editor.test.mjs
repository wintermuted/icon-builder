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
  if (browser) await server.close();
});
beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  page = await context.newPage();
  page.setDefaultTimeout(5000);
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://unpkg.com/lucide@*/**", (route) =>
    route.fulfill({
      path: "node_modules/lucide/dist/umd/lucide.js",
      contentType: "text/javascript",
    }),
  );
  await page.route("https://cdn.jsdelivr.net/**", (route) =>
    route.fulfill({
      body: "window.mermaid = { initialize() {}, async run() {} };",
      contentType: "text/javascript",
    }),
  );
  await page.goto(`${server.url}/preview/index.html#asset/fixture`);
  try {
    await page.locator("#asset-detail-layers .asset-layer-number").first().waitFor();
  } catch (error) {
    throw new Error(
      `${error.message}\nBrowser errors: ${errors.join("; ")}\n${await page.locator(".preview-content").textContent()}`,
    );
  }
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
});

async function selectLayer(number, modifiers = []) {
  await page
    .locator(`.asset-layer-number[aria-label="Select element ${number}"]`)
    .click({ modifiers });
}
async function geometry(id) {
  return page.locator(`#asset-primary-svg #${id}`).evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      transform: element.getAttribute("transform") || "",
    };
  });
}
async function drag(locator, dx, dy) {
  const box = await locator.boundingBox();
  assert.ok(box, "Drag target is visible");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

test("selection, keyboard movement, and return navigation retain one listener", async () => {
  await selectLayer(1);
  await page.locator("#asset-primary-preview").click({ position: { x: 1, y: 1 } });
  await selectLayer(1);
  const before = await geometry("first");
  await page.keyboard.press("ArrowRight");
  assert.match((await geometry("first")).transform, /translate\(1 0\)/);
  await page.evaluate(() => (window.location.hash = "asset/other"));
  await page.locator("#asset-detail-title").filter({ hasText: "Other asset" }).waitFor();
  await page.evaluate(() => (window.location.hash = "asset/fixture"));
  await page.locator("#asset-detail-title").filter({ hasText: "Editor fixture" }).waitFor();
  await selectLayer(1);
  await page.keyboard.press("ArrowRight");
  const after = await geometry("first");
  assert.match(after.transform, /translate\(2 0\)/);
  assert.ok(after.x > before.x);
});

test("multi-selection, combining, and pending group focus remain synchronized", async () => {
  await page.getByLabel("Select element 1 for combining", { exact: true }).check();
  await page.getByLabel("Select element 2 for combining", { exact: true }).check();
  await page.getByRole("button", { name: "Combine elements", exact: true }).click();
  await page.getByLabel("Group name", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByLabel("Group name", { exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await selectLayer(1);
  await page
    .locator(".asset-layer-draggable")
    .filter({ has: page.locator('[aria-label="Select element 2"]') })
    .click({ modifiers: ["Shift"] });
  assert.equal(
    await page.getByLabel("Select element 1 for combining", { exact: true }).isChecked(),
    true,
  );
  assert.equal(
    await page.getByLabel("Select element 2 for combining", { exact: true }).isChecked(),
    true,
  );
  assert.equal(
    await page.locator("#asset-primary-handles").evaluate((e) => e.classList.contains("is-group")),
    true,
  );
});

test("group dragging and proportional resizing update both selected elements", async () => {
  await selectLayer(1);
  await page
    .locator(".asset-layer-draggable")
    .filter({ has: page.locator('[aria-label="Select element 2"]') })
    .click({ modifiers: ["Shift"] });
  const first = await geometry("first"),
    second = await geometry("second");
  await drag(page.locator("#asset-primary-svg #first"), 24, 16);
  const movedFirst = await geometry("first"),
    movedSecond = await geometry("second");
  assert.ok(movedFirst.x > first.x && movedSecond.x > second.x);
  assert.ok(Math.abs(movedFirst.x - first.x - (movedSecond.x - second.x)) < 1);
  await drag(page.locator('.asset-resize-handle[data-handle="se"]'), 30, 30);
  assert.ok((await geometry("first")).width > first.width);
  assert.ok((await geometry("second")).width > second.width);
  assert.equal(await page.locator(".asset-rotate-handle").isVisible(), false);
});

test("a delayed SVG load cannot overwrite a newly selected asset", async () => {
  let release;
  const delayed = new Promise((resolve) => (release = resolve));
  await page.route("**/assets/svg/fixture.svg", async (route) => {
    await delayed;
    await route.continue();
  });
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#asset-detail-title").filter({ hasText: "Editor fixture" }).waitFor();
    await page.evaluate(() => (window.location.hash = "asset/other"));
    await page.locator("#asset-primary-svg svg[data-fixture=other]").waitFor();
    const completed = page.waitForResponse("**/assets/svg/fixture.svg");
    release();
    await (await completed).finished();
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    assert.equal(
      await page.locator("#asset-primary-svg svg").getAttribute("data-fixture"),
      "other",
    );
    assert.equal(await page.locator("#asset-detail-layers").getAttribute("data-asset-id"), "other");
  } finally {
    release();
  }
});

test("attribute and opacity editing, reorder, and saving preserve serialized edits", async () => {
  await page.getByLabel("Edit element 1", { exact: true }).click();
  const x = page.getByLabel("Element 1 x", { exact: true });
  await x.fill("33");
  await x.dispatchEvent("change");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("x"), "33");
  await page.getByLabel("Close element editor", { exact: true }).click();
  await page.getByLabel("Edit element 1 opacity", { exact: true }).first().click();
  const opacity = page.getByLabel("Element 1 opacity", { exact: true });
  await opacity.fill("0.4");
  await opacity.dispatchEvent("input");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("opacity"), "0.4");
  await page.getByLabel("Move element 1 up", { exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll("#asset-primary-svg svg rect")[1]?.id === "first",
  );
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("x"), "33");
  const count = server.requests.length;
  await page.locator("#asset-save-button").click();
  await page.waitForFunction(() => document.querySelector("#asset-save-button").disabled);
  const saved = server.requests.slice(count).find((item) => item.path === "/~asset");
  assert.ok(saved);
  assert.equal(saved.payload.id, "fixture");
  assert.match(saved.payload.svg, /x="33"/);
  assert.match(saved.payload.svg, /opacity="0.4"/);
});

test("resize, rotation, grid controls, and polygon point editing retain live gesture state", async () => {
  await selectLayer(1);
  const initial = await geometry("first");
  await drag(page.locator('.asset-resize-handle[data-handle="se"]'), 30, 20);
  const resized = await geometry("first");
  assert.ok(resized.width > initial.width);
  assert.ok(resized.height > initial.height);
  await drag(page.locator(".asset-rotate-handle"), 25, 15);
  assert.match((await geometry("first")).transform, /rotate\(/);
  await page.locator("#asset-grid-visibility-toggle").click();
  assert.equal(await page.locator("#asset-primary-grid").isVisible(), true);
  await page.locator("#asset-grid-snap-toggle").click();
  assert.equal(await page.locator("#asset-grid-snap-toggle").getAttribute("aria-pressed"), "true");
  await page.locator("#asset-primary-svg #triangle").dblclick();
  await page.locator(".asset-point-handle").first().waitFor();
  const original = await page.locator("#asset-primary-svg #triangle").getAttribute("points");
  await drag(page.locator(".asset-point-handle").first(), 20, 10);
  assert.notEqual(
    await page.locator("#asset-primary-svg #triangle").getAttribute("points"),
    original,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#asset-primary-points").isVisible(), false);
});

test("project and source routes preserve prompts, slots, and color mutation payloads", async () => {
  await page.evaluate(() => (window.location.hash = "project/Fixture%20Project"));
  await page.locator("#project-detail-title").filter({ hasText: "Fixture Project" }).waitFor();
  assert.match(
    await page.locator("#project-sample-prompt").textContent(),
    /Project: Fixture Project/,
  );
  assert.equal(
    await page.locator(".icon-slot-image-link").first().getAttribute("href"),
    "#asset/fixture",
  );
  const count = server.requests.length;
  await page.locator('.source-material-swatch[data-color="#445566"]').click();
  const changed = server.requests.slice(count).find((item) => item.path === "/~project-color");
  assert.deepEqual(changed.payload, {
    project: "Fixture Project",
    color: "#445566",
    selected: true,
    custom: false,
  });
  await page.locator(".source-material-image-link").click();
  await page.locator("#source-detail-title").filter({ hasText: "Reference" }).waitFor();
  assert.match(
    await page.locator("#source-prompt-reference").textContent(),
    /Repository file: assets\/svg\/steering.svg/,
  );
});

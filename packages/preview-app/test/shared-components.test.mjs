import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
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
  await server.close();
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
  await page.goto(`${server.url}/preview/index.html#project/Fixture%20Project`);
  await page.locator("#project-detail-title").filter({ hasText: "Fixture Project" }).waitFor();
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
});

test("shared rename forms retain project/source mutation payloads and visible errors", async () => {
  const mutations = [];
  await page.route("**/~project", (route) => {
    mutations.push(route.request().postDataJSON());
    return route.fulfill({ status: 400, json: { error: "Project name already exists." } });
  });
  await page.locator("#project-rename-button").click();
  const name = page.locator("#project-rename-input");
  assert.equal(await name.evaluate((input) => input === document.activeElement), true);
  await name.fill(" Renamed Project ");
  await page.locator("#project-rename-form button[type=submit]").click();
  await page
    .locator("#project-rename-status")
    .filter({ hasText: "Project name already exists." })
    .waitFor();
  assert.deepEqual(mutations, [{ project: "Fixture Project", name: "Renamed Project" }]);
  assert.equal(await page.locator("#project-rename-form button[type=submit]").isEnabled(), true);
  await page.locator("#project-rename-cancel").click();
  await page.locator("#project-rename-button").click();
  assert.equal(await name.inputValue(), "Fixture Project");

  await page.route("**/~grounding-source", (route) => {
    mutations.push(route.request().postDataJSON());
    return route.fulfill({ status: 400, json: { error: "Source rename failed." } });
  });
  await page.getByRole("button", { name: "Rename Reference", exact: true }).click();
  await page.getByRole("textbox", { name: "Image name", exact: true }).fill("Renamed source");
  await page.locator(".source-material-editor button[type=submit]").click();
  await page
    .locator(".source-material-status")
    .filter({ hasText: "Source rename failed." })
    .waitFor();
  assert.deepEqual(mutations[1], {
    project: "Fixture Project",
    source: "assets/svg/steering.svg",
    action: "rename",
    filename: "Renamed source",
  });
});

test("the shared dropzone leaves image encoding and upload requests in the app", async () => {
  const count = server.requests.length;
  const response = page.waitForResponse((response) => response.url().endsWith("/~grounding-image"));
  await page.locator("#project-grounding-input").setInputFiles({
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from("upload fixture"),
  });
  await response;
  const upload = server.requests
    .slice(count)
    .find((request) => request.path === "/~grounding-image");
  assert.deepEqual(upload.payload, {
    project: "Fixture Project",
    filename: "reference.png",
    dataUrl: `data:image/png;base64,${Buffer.from("upload fixture").toString("base64")}`,
  });
});

test("card composition, carousel focus, and notifications retain desktop/mobile behavior", async () => {
  await page.locator("#project-generate-new").click();
  assert.equal(
    await page
      .locator("#project-prompt-copy")
      .evaluate((button) => button === document.activeElement),
    true,
  );
  const asset = page.locator("#project-asset-grid > article").first();
  assert.equal(
    await asset.locator(":scope > .asset-preview-link").getAttribute("href"),
    "#asset/fixture",
  );
  assert.equal(await asset.locator(":scope > .asset-title-link").textContent(), "Editor fixture");
  assert.equal(await asset.locator(":scope > .asset-tile-footer").count(), 1);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text) => (window.copiedLink = text) },
    }),
  );
  await asset.getByRole("button", { name: "Copy Editor fixture deep link", exact: true }).click();
  await page.locator("#app-toast").filter({ hasText: "Asset link copied." }).waitFor();
  assert.equal(
    await page.evaluate(() => window.copiedLink),
    `${server.url}/preview/index.html#asset/fixture`,
  );
  const source = page.locator(".source-material-card").first();
  assert.equal(
    await source.locator(":scope > .source-material-image-link").getAttribute("href"),
    "#source/Fixture%20Project/assets%2Fsvg%2Fsteering.svg",
  );
  if (process.env.PREVIEW_SHARED_SCREENSHOTS === "1") {
    await mkdir("outputs/screenshots", { recursive: true });
    await page.screenshot({
      path: "outputs/screenshots/shared-components-desktop.png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page
      .locator(".project-prompt-controls")
      .evaluate((element) => getComputedStyle(element).flexDirection),
    "column",
  );
  const dropzone = await page.locator("#project-grounding-dropzone").boundingBox();
  assert.ok(dropzone.x >= 0 && dropzone.x + dropzone.width <= 390);
  if (process.env.PREVIEW_SHARED_SCREENSHOTS === "1")
    await page.screenshot({
      path: "outputs/screenshots/shared-components-mobile.png",
      fullPage: true,
    });
});

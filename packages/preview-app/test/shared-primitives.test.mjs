import assert from "node:assert/strict";
import { after, before, beforeEach, afterEach, test } from "node:test";
import { chromium } from "playwright";
import { startPreviewTestServer } from "./preview-test-server.mjs";

let server, browser, context, page, errors;
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
  page.setDefaultTimeout(10000);
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) errors.push(message.text());
  });
  await page.route("**/assets/svg/fixture.svg", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace('<rect id="first"', '<rect id="first" opacity="0.5"'),
    });
  });
  await page.route("https://cdn.jsdelivr.net/**", (route) =>
    route.fulfill({
      body: "window.mermaid = { initialize() {}, async render() { return { svg: '<svg></svg>' }; } };",
      contentType: "text/javascript",
    }),
  );
  await page.goto(`${server.url}/preview/index.html#asset/fixture`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Edit source size", exact: true }).waitFor();
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(errors, [], "No runtime errors or React lifecycle warnings");
});

test("portal steppers preserve fractional edits, focus, selection, and theme updates", async () => {
  await page.getByLabel("Edit element 1", { exact: true }).click();
  const x = page.getByRole("spinbutton", { name: "Element 1 x", exact: true });
  await x.fill("20.25");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("x"), "20.25");
  await page.getByRole("button", { name: "Increase Element 1 x", exact: true }).click();
  assert.equal(await x.inputValue(), "21.25");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("x"), "21.25");
  await page.locator("#theme-toggle").click();
  await page.getByRole("button", { name: "Decrease Element 1 x", exact: true }).click();
  assert.equal(await x.inputValue(), "20.25");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("x"), "20.25");
  await x.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("transform"), null);
  const opacity = page.getByRole("spinbutton", { name: "Element 1 opacity", exact: true });
  await opacity.fill("0.25");
  await page.getByRole("button", { name: "Increase Element 1 opacity", exact: true }).click();
  assert.equal(await opacity.inputValue(), "0.26");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("opacity"), "0.26");
  await page.getByLabel("Close element editor", { exact: true }).click();
  await page.getByLabel("Edit element 1 opacity", { exact: true }).first().click();
  assert.equal(await opacity.inputValue(), "0.26");
});

test("editable diagnostic summaries apply and cancel without replacing native form hooks", async () => {
  const initialWidth = await page.locator("#asset-primary-svg svg").getAttribute("width");
  await page.getByRole("button", { name: "Edit source size", exact: true }).click();
  const width = page.getByRole("spinbutton", { name: "Source width", exact: true });
  assert.equal(await width.evaluate((element) => element === document.activeElement), true);
  await width.fill("300");
  const form = page.locator("[data-source-size-editor] form");
  await form.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.locator("#asset-primary-svg svg").getAttribute("width"), initialWidth);
  await page.getByRole("button", { name: "Edit source size", exact: true }).click();
  await width.fill("300");
  await form.getByRole("button", { name: "Apply", exact: true }).click();
  assert.equal(await page.locator("#asset-primary-svg svg").getAttribute("width"), "300");
  await page
    .getByRole("button", { name: "Edit accessible title and description", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Accessible title", exact: true }).fill("Updated title");
  await page
    .getByRole("textbox", { name: "Accessible description", exact: true })
    .fill("Editable rectangles");
  const accessibility = page.locator("[data-accessibility-editor] form");
  await accessibility.getByRole("button", { name: "Apply", exact: true }).click();
  assert.equal(await page.locator("#asset-primary-svg svg title").textContent(), "Updated title");
  assert.equal(
    await page.locator("#asset-primary-svg svg desc").textContent(),
    "Editable rectangles",
  );
  await page.locator("#theme-toggle").click();
  assert.equal(
    await page.locator(".asset-accessibility-summary code").first().textContent(),
    "300 × 240",
  );
  assert.equal(
    await page.locator(".asset-accessibility-summary code").last().textContent(),
    "Updated title",
  );
  assert.equal(await page.locator("#asset-detail-diagnostics > dl > dt").count(), 9);
});

test("refreshes and cached return navigation leave a single active presentation", async () => {
  await page.getByLabel("Move element 1 up", { exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll("#asset-primary-svg rect")[1]?.id === "first",
  );
  for (const id of ["other", "fixture", "other", "fixture"]) {
    await page.evaluate((id) => {
      window.location.hash = `asset/${id}`;
    }, id);
    await page.locator(`#asset-primary-svg svg[data-fixture="${id}"]`).waitFor();
    await page.getByRole("button", { name: "Edit source size", exact: true }).waitFor();
    assert.equal(await page.locator(".asset-accessibility-summary").count(), 2);
    assert.equal(await page.locator("#asset-detail-diagnostics > dl").count(), 1);
  }
  await page.getByLabel("Edit element 1", { exact: true }).click();
  const x = page.getByRole("spinbutton", { name: "Element 1 x", exact: true });
  const previous = Number(await x.inputValue());
  await page.getByRole("button", { name: "Increase Element 1 x", exact: true }).click();
  assert.equal(Number(await x.inputValue()), previous + 1);
  await page.getByLabel("Close element editor", { exact: true }).click();
  await page.getByLabel("Select element 1 for combining", { exact: true }).check();
  await page.getByLabel("Select element 2 for combining", { exact: true }).check();
  await page.getByRole("button", { name: "Combine elements", exact: true }).click();
  await page.getByLabel("Group name", { exact: true }).waitFor();
  assert.equal(await page.locator("#asset-detail-diagnostics > dl").count(), 1);
  assert.equal(await page.locator(".asset-accessibility-summary").count(), 2);
});

test("anchored range controls preserve opacity synchronization and native dismissal", async () => {
  const trigger = page.getByRole("button", { name: "Edit element 1 opacity", exact: true }).first();
  await trigger.click();
  const panel = page.getByRole("dialog", { name: "Edit element 1 opacity", exact: true });
  const number = panel.getByRole("spinbutton");
  const slider = panel.getByRole("slider");
  await number.fill("0.29");
  await panel.getByRole("button", { name: "Increase opacity", exact: true }).click();
  assert.equal(await number.inputValue(), "0.3");
  assert.equal(await slider.inputValue(), "0.3");
  assert.equal(await page.locator("#asset-primary-svg #first").getAttribute("opacity"), "0.3");
  await slider.focus();
  await slider.press("End");
  assert.equal(await number.inputValue(), "1");
  await panel.getByRole("button", { name: "Increase opacity", exact: true }).click();
  assert.equal(await number.inputValue(), "1");
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document
        .querySelector('.asset-layer-opacity-value[aria-label="Edit element 1 opacity"]')
        ?.getAttribute("aria-expanded") === "false",
  );
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  await page.locator("#theme-toggle").click();
  await trigger.click();
  assert.equal(await number.inputValue(), "1");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const panel = document.querySelector(".wm-anchored-popover:popover-open");
    if (!panel) return false;
    const box = panel.getBoundingClientRect();
    return (
      box.x >= 7.5 &&
      box.y >= 7.5 &&
      box.right <= innerWidth - 7.5 &&
      box.bottom <= innerHeight - 7.5
    );
  });
  await page.evaluate(() => {
    location.hash = "asset/other";
  });
  await page.locator("#asset-primary-svg svg[data-fixture=other]").waitFor();
  assert.equal(await page.locator(".wm-anchored-popover:popover-open").count(), 0);
});

test("split-button shape choices retain root and group creation payloads", async () => {
  const chooseCircle = async () => {
    await page.getByLabel("Change element shape", { exact: true }).click();
    await page.getByRole("button", { name: "Circle", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector(".asset-layer-add-button")?.dataset.shape === "circle",
    );
  };
  await chooseCircle();
  assert.equal(await page.locator(".asset-layer-shape-menu").getAttribute("open"), null);
  assert.equal(await page.locator(".asset-layer-shape-option[data-shape=circle]").count(), 1);
  await page.getByRole("button", { name: "Add element", exact: true }).click();
  await page.locator("#asset-primary-svg svg > circle").waitFor();
  await page.getByLabel("Select element 1 for combining", { exact: true }).check();
  await page.getByLabel("Select element 2 for combining", { exact: true }).check();
  await page.getByRole("button", { name: "Combine elements", exact: true }).click();
  await page.getByLabel("Group name", { exact: true }).waitFor();
  await chooseCircle();
  await page.getByRole("button", { name: "Add element to this group", exact: true }).click();
  await page.locator("#asset-primary-svg svg g circle").waitFor();
  const count = server.requests.length;
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/~asset")),
    page.locator("#asset-save-button").click(),
  ]);
  const saved = server.requests.slice(count).find((request) => request.path === "/~asset");
  assert.match(saved.payload.svg, /<g[\s\S]*<circle/);
});

test("selectable rows retain direct list semantics, reorder boundaries, and drag/drop", async () => {
  assert.equal(await page.locator("#asset-detail-layers > li.wm-selectable-list-item").count(), 3);
  assert.equal(await page.getByLabel("Move element 1 down", { exact: true }).isDisabled(), true);
  assert.equal(await page.getByLabel("Move element 3 up", { exact: true }).isDisabled(), true);
  const first = page.locator("li.wm-selectable-list-item").filter({
    has: page.getByRole("button", { name: "Select element 1", exact: true }),
  });
  await first.click({ position: { x: 5, y: 5 } });
  assert.equal(await first.evaluate((node) => node.classList.contains("is-selected")), true);
  const target = page.locator("li.wm-selectable-list-item").filter({
    has: page.getByRole("button", { name: "Select element 2", exact: true }),
  });
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await first.dispatchEvent("dragstart", { dataTransfer: transfer });
  await target.dispatchEvent("dragover", { dataTransfer: transfer });
  assert.equal(await target.evaluate((node) => node.classList.contains("is-drag-over")), true);
  await target.dispatchEvent("drop", { dataTransfer: transfer });
  await page.waitForFunction(
    () => document.querySelectorAll("#asset-primary-svg rect")[1]?.id === "first",
  );
  assert.equal(await page.locator("#asset-detail-layers .is-drag-over").count(), 0);
});

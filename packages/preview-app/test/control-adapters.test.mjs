import assert from "node:assert/strict";
import { after, before, beforeEach, afterEach, test } from "node:test";
import { chromium } from "playwright";
import { startPreviewTestServer } from "./preview-test-server.mjs";

let server, browser, context, page, errors;
before(async () => {
  server = await startPreviewTestServer();
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
  context = await browser.newContext();
  page = await context.newPage();
  errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/control-adapters.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html data-theme="light"><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh"; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type; window.__vite_plugin_react_preamble_installed__ = true;</script><script type="module" src="/packages/preview-app/test/control-adapters.fixture.tsx"></script></body></html>',
    }),
  );
  await page.goto(`${server.url}/control-adapters.html`);
  await page.getByRole("button", { name: "Show grid", exact: true }).waitFor();
});
afterEach(async () => {
  await context?.close();
  assert.deepEqual(errors, [], "No browser runtime errors");
});

test("button adapters preserve cancellation, disabled state, refs, and native submit attributes", async () => {
  const toggle = page.getByRole("button", { name: "Show grid", exact: true });
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  await page.getByLabel("Cancel toggle").check();
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  assert.equal(await toggle.getAttribute("data-controller"), "grid");
  assert.equal(await page.getByRole("button", { name: "Disabled grid" }).isDisabled(), true);
  await page.getByRole("button", { name: "Focus save" }).click();
  const save = page.getByRole("button", { name: "Save source" });
  assert.equal(await save.evaluate((node) => node === document.activeElement), true);
  assert.equal(await save.getAttribute("name"), "action");
  assert.equal(await save.getAttribute("value"), "save");
  assert.equal(await save.getAttribute("title"), "Save source");
  assert.equal(await save.locator('svg[aria-hidden="true"]').count(), 1);
  await save.hover();
  await page.waitForFunction(() => {
    const save = document.querySelector('[aria-label="Save source"]');
    return getComputedStyle(save).backgroundColor !== "rgba(0, 0, 0, 0)";
  });
  await save.press("Enter");
  assert.equal(await page.getByLabel("Submissions").textContent(), "1");
});

test("local toast timing resets on repeats and supports immediate accessible dismissal", async () => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const show = page.getByRole("button", { name: "Show notification" });
  const toast = page.locator("#test-toast");
  await show.click();
  await page.clock.runFor(2000);
  await show.click();
  await page.clock.runFor(2399);
  assert.equal(await toast.isVisible(), true);
  assert.equal(await toast.getByRole("status").getAttribute("aria-live"), "polite");
  await page.clock.runFor(1);
  assert.equal(await toast.isVisible(), false);
  assert.equal(await page.getByLabel("Dismissals").textContent(), "1");
  await show.click();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  assert.equal(await toast.isVisible(), false);
  assert.equal(await page.getByLabel("Dismissals").textContent(), "2");
  await page.clock.runFor(3000);
  assert.equal(await page.getByLabel("Dismissals").textContent(), "2");
  await show.click();
  assert.equal(await toast.isVisible(), true);
});

test("dialog and form compatibility preserves mounting, focus, hints, errors, and inline semantics", async () => {
  const open = page.getByRole("button", { name: "New project", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "New project" });
  const name = dialog.getByRole("textbox", { name: "Project name", exact: true });
  assert.equal(await name.evaluate((node) => node === document.activeElement), true);
  assert.equal(await name.getAttribute("required"), "");
  assert.equal(await name.getAttribute("aria-invalid"), "true");
  assert.equal(await page.locator("#project-heading").textContent(), "New project");
  assert.deepEqual((await name.getAttribute("aria-describedby")).split(" "), [
    "external-help",
    "project-hint",
    "project-name-error",
  ]);
  assert.match(await dialog.getByRole("alert").textContent(), /three characters/);
  await name.fill("Marks");
  assert.equal(await name.evaluate((node) => node === document.activeElement), true);
  assert.equal(await name.getAttribute("aria-invalid"), null);
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await dialog
      .getByRole("button", { name: "Close", exact: true })
      .evaluate((node) => node === document.activeElement),
    true,
  );
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await dialog
      .getByRole("button", { name: "Done" })
      .evaluate((node) => node === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await open.evaluate((node) => node === document.activeElement), true);
  await open.click();
  await name.click();
  assert.equal(await dialog.isVisible(), true);
  await page.locator(".np-backdrop").click({ position: { x: 1, y: 1 } });
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await open.evaluate((node) => node === document.activeElement), true);
  assert.equal(
    await page
      .locator(".wm-form-field--inline")
      .evaluate((node) => getComputedStyle(node).flexDirection),
    "row",
  );
  assert.equal(
    await page.locator("p.wm-status-message").first().getAttribute("aria-live"),
    "polite",
  );
  assert.equal(await page.getByRole("alert").getAttribute("aria-live"), "assertive");
});

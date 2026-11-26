import assert from "node:assert/strict";

export async function verifyLayoutInteractions(page, base) {
  const show = async (id) => {
    await page.goto(`${base}iframe.html?id=shared-${id}&viewMode=story`);
    await page.locator("#storybook-root > *").first().waitFor();
  };
  for (const [story, boundary] of [
    ["balanced", 720],
    ["guidance", 680],
    ["workspace", 899],
  ]) {
    await show(`splitlayout--${story}`);
    const split = page.locator(".wm-split-layout");
    for (const [width, expected] of [
      [boundary + 1, 2],
      [boundary, 1],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await split.evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
        ),
        expected,
        `${story} at ${width}px`,
      );
    }
  }
  await show("responsivegrid--fit");
  await page.setViewportSize({ width: 210, height: 900 });
  const grid = page.locator(".wm-responsive-grid");
  assert.equal(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
    ),
    1,
  );
  assert.equal(
    await grid.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Array.from(element.children).every(
        (child) => child.getBoundingClientRect().right <= bounds.right + 1,
      );
    }),
    true,
    "Grid items fit a container narrower than minItemWidth",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await show("responsivegrid--fill");
  assert.ok(
    await page
      .locator(".wm-responsive-grid")
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length > element.children.length,
      ),
    "Auto-fill retains empty tracks",
  );

  await show("formfield--with-error");
  const field = page.getByRole("textbox", { name: "Project name", exact: true });
  assert.equal(await field.getAttribute("aria-invalid"), "true");
  assert.equal(await field.evaluate((input) => input.required), true);
  const descriptions = (await field.getAttribute("aria-describedby")).split(" ");
  assert.equal(descriptions.length, 2);
  for (const id of descriptions) assert.equal(await page.locator(`[id="${id}"]`).count(), 1);
  await field.fill("Valid project");
  assert.equal(await field.getAttribute("aria-invalid"), null);
  assert.equal(await page.getByRole("alert").count(), 0);
  assert.equal((await field.getAttribute("aria-describedby")).split(" ").length, 1);

  await show("togglebutton--interactive");
  const toggle = page.getByRole("button", { name: "Show grid", exact: true });
  await toggle.click();
  await page.getByRole("button", { name: "Show grid", pressed: true }).waitFor();
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  await toggle.click();
  await page.getByRole("button", { name: "Show grid", pressed: false }).waitFor();
  assert.equal(await toggle.getAttribute("aria-pressed"), "false");
  await show("togglebutton--disabled");
  assert.equal(
    await page.getByRole("button", { name: "Show grid", pressed: true }).isDisabled(),
    true,
  );
  await page.locator(".wm-toggle-button").evaluate((element) => {
    element.hidden = true;
  });
  assert.equal(await page.locator(".wm-toggle-button").isVisible(), false);

  await show("resourcelinklist--documentation");
  for (const link of await page.locator(".wm-resource-link-list a").all()) {
    assert.equal(await link.getAttribute("target"), "_blank");
    assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
  }
  await show("resourcelinklist--internal");
  assert.equal(await page.locator(".wm-resource-link-list a").first().getAttribute("target"), null);
  await page.locator(".wm-resource-link-list").evaluate((element) => {
    element.hidden = true;
  });
  assert.equal(await page.locator(".wm-resource-link-list").isVisible(), false);
  await show("statusmessage--progress");
  assert.equal(await page.locator(".wm-status-message").getAttribute("aria-live"), "polite");
  assert.equal(await page.getByRole("status").count(), 0);
  await show("statusmessage--error");
  assert.equal(await page.getByRole("alert").getAttribute("aria-live"), "assertive");
  await show("actiongroup--end");
  assert.equal(
    await page.locator(".wm-action-group").evaluate((element) => {
      const last = element.lastElementChild.getBoundingClientRect();
      return Math.abs(last.right - element.getBoundingClientRect().right) < 1;
    }),
    true,
    "End-aligned actions reach the container edge",
  );
  assert.equal(await page.getByRole("toolbar").count(), 0);
  await show("emptystate--first-asset");
  assert.equal(await page.getByRole("link", { name: "Add first asset" }).count(), 1);
  await show("pageheader--with-navigation");
  assert.equal(await page.getByRole("heading", { name: "Project assets" }).count(), 1);
  assert.equal(
    await page.locator(".wm-page-header").evaluate((element) => getComputedStyle(element).position),
    "sticky",
  );
  for (const story of ["short-content", "long-content"]) {
    await show(`appframe--${story}`);
    const main = await page.locator(".wm-app-frame-main").boundingBox();
    const footer = await page.locator(".wm-app-frame > footer").boundingBox();
    assert.ok(footer.y >= main.y + main.height, `${story} footer does not cover content`);
    if (story === "short-content")
      assert.ok(
        footer.y + footer.height >= 850,
        "Footer follows short content to the viewport bottom",
      );
  }
}

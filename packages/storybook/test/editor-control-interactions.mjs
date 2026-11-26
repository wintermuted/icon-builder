import assert from "node:assert/strict";

export async function verifyEditorControlInteractions(page, base) {
  const open = async (id) => {
    await page.goto(`${base}iframe.html?id=${id}&viewMode=story`);
    await page.locator("#storybook-root > *").first().waitFor();
  };
  const numericValue = (label, value) =>
    page.waitForFunction(
      ({ label, value }) =>
        document.querySelector(`input[type="number"][aria-label="${label}"]`)?.value === value,
      { label, value },
    );
  await open("shared-rangenumbercontrol--default");
  const number = page.getByRole("spinbutton", { name: "Opacity", exact: true });
  const range = page.getByRole("slider", { name: "Opacity", exact: true });
  await number.fill("0.29");
  await numericValue("Opacity", "0.29");
  await page.getByRole("button", { name: "Increase Opacity", exact: true }).click();
  await numericValue("Opacity", "0.3");
  assert.equal(await range.inputValue(), "0.3");
  await range.focus();
  await range.press("End");
  await numericValue("Opacity", "1");
  await page.getByRole("button", { name: "Increase Opacity", exact: true }).click();
  assert.equal(await number.inputValue(), "1");
  await range.press("Home");
  await numericValue("Opacity", "0");
  await page.getByRole("button", { name: "Decrease Opacity", exact: true }).click();
  assert.equal(await number.inputValue(), "0");
  await open("shared-rangenumbercontrol--disabled");
  assert.equal(await page.getByRole("spinbutton").isDisabled(), true);
  assert.equal(await page.getByRole("slider").isDisabled(), true);

  await open("shared-reordercontrols--interactive");
  assert.equal(await page.getByRole("button", { name: "Move Alpha up" }).isDisabled(), true);
  await page.getByRole("button", { name: "Move Beta up" }).click();
  assert.match(await page.locator("#storybook-root ol li").first().textContent(), /Beta/);
  await page.getByRole("button", { name: "Move Beta down" }).click();
  assert.match(await page.locator("#storybook-root ol li").first().textContent(), /Alpha/);
  assert.equal(await page.getByRole("button", { name: "Move Gamma down" }).isDisabled(), true);

  await open("shared-selectablelistitem--interactive");
  const circle = page.getByRole("button", { name: "Circle", exact: true });
  await circle.click();
  assert.equal(await circle.getAttribute("aria-pressed"), "true");
  const item = page.locator("li").filter({ has: circle });
  assert.equal(await item.evaluate((node) => node.classList.contains("is-selected")), true);
  await page.getByRole("checkbox", { name: "Mark Circle" }).check();
  assert.equal(await item.evaluate((node) => node.classList.contains("is-multi-selected")), true);
  await circle.focus();
  await circle.press("Space");
  assert.equal(await circle.getAttribute("aria-pressed"), "true");

  for (const id of ["default", "viewport-edge", "long-content"]) {
    await open(`shared-anchoredpopover--${id}`);
    const trigger = page.getByRole("button", { name: "Open controls", exact: true });
    await trigger.click();
    const panel = page.getByRole("dialog", { name: "Preview controls", exact: true });
    await panel.waitFor();
    await page.waitForFunction(() => {
      const panel = document.querySelector(".wm-anchored-popover");
      if (!panel?.matches(":popover-open")) return false;
      const box = panel.getBoundingClientRect();
      return (
        box.x >= 7.5 &&
        box.y >= 7.5 &&
        box.right <= window.innerWidth - 7.5 &&
        box.bottom <= window.innerHeight - 7.5
      );
    });
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    if (id === "long-content")
      assert.equal(await panel.evaluate((node) => node.scrollHeight > node.clientHeight), true);
    await page.locator("body").press("Escape");
    await page.waitForFunction(
      () =>
        !document.querySelector(".wm-anchored-popover")?.matches(":popover-open") &&
        document.querySelector("button[popovertarget]")?.getAttribute("aria-expanded") === "false",
    );
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  }

  await open("shared-splitbutton--default");
  const menu = page.getByLabel("Choose shape", { exact: true });
  await menu.click();
  await page.getByRole("button", { name: "Circle", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".wm-split-button > button")?.getAttribute("data-value") === "circle",
  );
  assert.equal(await page.locator("details").getAttribute("open"), null);
  await page.getByRole("button", { name: "Add element", exact: true }).click();
  assert.equal(await page.getByRole("status").textContent(), "Added circle");
  await menu.focus();
  await menu.press("ArrowDown");
  assert.equal(
    await page
      .getByRole("button", { name: "Rectangle", exact: true })
      .evaluate((node) => node === document.activeElement),
    true,
  );
  await page.getByRole("button", { name: "Rectangle", exact: true }).press("End");
  await page.getByRole("button", { name: "Path", exact: true }).press("Enter");
  await page.waitForFunction(
    () =>
      document.querySelector(".wm-split-button > button")?.getAttribute("data-value") === "path",
  );
  await menu.click();
  await menu.press("Escape");
  assert.equal(await page.locator("details").getAttribute("open"), null);
  await menu.click();
  await page.getByRole("status").click();
  assert.equal(await page.locator("details").getAttribute("open"), null);

  for (const id of ["disabled", "empty"]) {
    await open(`shared-splitbutton--${id}`);
    assert.equal(
      await page.getByRole("button", { name: "Add element", exact: true }).isDisabled(),
      true,
    );
    assert.equal(
      await page.getByLabel("Choose shape", { exact: true }).getAttribute("aria-disabled"),
      "true",
    );
    await page.getByLabel("Choose shape", { exact: true }).press("Enter");
    assert.equal(await page.locator("details").getAttribute("open"), null);
  }

  await open("shared-splitbutton--changing-options");
  await page.getByLabel("Choose shape", { exact: true }).click();
  await page.getByRole("button", { name: "Circle", exact: true }).click();
  await page.getByRole("button", { name: "Remove Circle", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".wm-split-button > button")?.getAttribute("data-value") === "rect",
  );
  assert.equal(await page.getByRole("status").textContent(), "Choose a shape, then add it.");
  await page.getByRole("button", { name: "Add element", exact: true }).click();
  assert.equal(await page.getByRole("status").textContent(), "Added rect");
  await page.getByRole("button", { name: "Clear options", exact: true }).click();
  assert.equal(
    await page.getByRole("button", { name: "Add element", exact: true }).isDisabled(),
    true,
  );
  assert.equal(
    await page.getByLabel("Choose shape", { exact: true }).getAttribute("aria-disabled"),
    "true",
  );
  await page.getByRole("button", { name: "Restore options", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".wm-split-button > button")?.getAttribute("data-value") === "rect",
  );
  await page.getByLabel("Choose shape", { exact: true }).click();
  await page.getByRole("button", { name: "Circle", exact: true }).click();
  await page.getByRole("button", { name: "Clear options", exact: true }).click();
  await page.getByRole("button", { name: "Restore options", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".wm-split-button > button")?.getAttribute("data-value") === "rect",
  );
}

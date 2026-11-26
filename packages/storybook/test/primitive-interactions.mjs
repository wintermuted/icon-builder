import assert from "node:assert/strict";

export async function verifyPrimitiveInteractions(page, base) {
  const open = async (id) => {
    await page.goto(`${base}iframe.html?id=${id}&viewMode=story`);
    await page.locator("#storybook-root > *").first().waitFor();
  };
  const value = async (input, expected) => {
    await page.waitForFunction(
      ({ label, expected }) =>
        document.querySelector(`input[aria-label="${label}"]`)?.value === expected,
      { label: await input.getAttribute("aria-label"), expected },
    );
  };
  await open("shared-numberstepper--bounded-fractional");
  const opacity = page.getByRole("spinbutton", { name: "Opacity", exact: true });
  await opacity.fill("0.25");
  await value(opacity, "0.25");
  await page.getByRole("button", { name: "Increase Opacity", exact: true }).click();
  await value(opacity, "0.35");
  await opacity.fill("0.95");
  await value(opacity, "0.95");
  await page.getByRole("button", { name: "Increase Opacity", exact: true }).click();
  await value(opacity, "1");
  await page.getByRole("button", { name: "Increase Opacity", exact: true }).click();
  assert.equal(await opacity.inputValue(), "1");
  await opacity.fill("0");
  await value(opacity, "0");
  await page.getByRole("button", { name: "Decrease Opacity", exact: true }).click();
  assert.equal(await opacity.inputValue(), "0");

  await open("shared-numberstepper--disabled");
  assert.equal(await page.getByRole("spinbutton").isDisabled(), true);
  for (const button of await page.getByRole("button").all())
    assert.equal(await button.isDisabled(), true);

  await open("shared-propertylist--editable");
  assert.equal(await page.locator("dl.wm-property-list > dt").count(), 2);
  assert.equal(await page.locator("dl.wm-property-list > dd").count(), 2);
  await page.getByRole("button", { name: "Increase Width", exact: true }).click();
  assert.equal(
    await page.getByRole("spinbutton", { name: "Width", exact: true }).inputValue(),
    "51",
  );

  await open("shared-editablevalue--default");
  await page.getByRole("button", { name: "Edit ViewBox", exact: true }).click();
  const edit = page.getByRole("textbox", { name: "Value", exact: true });
  assert.equal(await edit.evaluate((element) => element === document.activeElement), true);
  await edit.fill("0 0 320 240");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  assert.equal(await page.locator(".wm-editable-value code").textContent(), "0 0 320 240");
  await page.getByRole("button", { name: "Edit ViewBox", exact: true }).click();
  await edit.fill("discarded");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.locator(".wm-editable-value code").textContent(), "0 0 320 240");

  await open("shared-previewsurface--icon");
  const image = page.getByRole("img", { name: "Geometric mark" });
  await image.evaluate((element) => element.decode());
  assert.ok((await image.boundingBox()).height <= 80);
  await open("shared-previewsurface--large-image");
  await image.evaluate((element) => element.decode());
  assert.ok((await image.boundingBox()).height <= 360);
  assert.equal(await image.evaluate((element) => getComputedStyle(element).objectFit), "contain");

  await open("shared-codeblock--wrapped");
  const code = page.locator("pre.wm-code-block");
  const text = await code.textContent();
  assert.match(text, /^<svg[\s\S]*\n<\/svg>$/);
  assert.equal(await code.evaluate((element) => getComputedStyle(element).whiteSpace), "pre-wrap");
  assert.equal(await code.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
  await open("shared-codeblock--horizontal-scroll");
  assert.equal(await code.textContent(), text);
  assert.equal(await code.evaluate((element) => getComputedStyle(element).whiteSpace), "pre");
  assert.equal(await code.evaluate((element) => element.scrollWidth > element.clientWidth), true);
}

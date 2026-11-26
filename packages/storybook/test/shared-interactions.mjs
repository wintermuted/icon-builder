import assert from "node:assert/strict";

export async function verifySharedInteractions(page, base) {
  const story = async (id, args = "") => {
    await page.goto(`${base}iframe.html?id=shared-${id}&viewMode=story${args}`);
    await page.locator("#storybook-root > *").first().waitFor();
  };
  const focused = (locator) => locator.evaluate((element) => element === document.activeElement);

  await story("iconactionbutton--default");
  assert.equal(await page.getByRole("button", { name: "Rename item", exact: true }).count(), 1);
  await story("iconactionbutton--disabled");
  assert.equal(
    await page.getByRole("button", { name: "Rename item", exact: true }).isDisabled(),
    true,
  );

  await story("inlinerename--editable");
  const name = page.getByRole("textbox", { name: "Item name", exact: true });
  assert.equal(await focused(name), true);
  assert.deepEqual(
    await name.evaluate((input) => [input.selectionStart, input.selectionEnd]),
    [0, 9],
  );
  await name.fill("Updated reference");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  assert.match(
    await page.locator('[aria-live="polite"]').textContent(),
    /Saved "Updated reference"/,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await name.isVisible(), false);
  await page.getByRole("button", { name: "Rename item", exact: true }).click();
  assert.equal(await name.inputValue(), "Reference");
  assert.equal(await focused(name), true);
  await story("inlinerename--busy");
  assert.equal(await page.getByRole("button", { name: "Save", exact: true }).isDisabled(), true);

  await story("dialog--interactive");
  const open = page.getByRole("button", { name: "Open dialog", exact: true });
  await open.click();
  const dialogName = page.getByRole("textbox", { name: "Name", exact: true });
  assert.equal(await focused(dialogName), true);
  await dialogName.fill("Reference");
  assert.equal(await focused(dialogName), true, "Parent updates do not reset dialog focus");
  await page.keyboard.press("Tab");
  assert.equal(await focused(page.getByRole("button", { name: "Done", exact: true })), true);
  await page.keyboard.press("Tab");
  assert.equal(await focused(page.getByRole("button", { name: "Close", exact: true })), true);
  await page.keyboard.press("Shift+Tab");
  assert.equal(await focused(page.getByRole("button", { name: "Done", exact: true })), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await focused(open), true);
  await open.click();
  await dialogName.click();
  assert.equal(await page.getByRole("dialog").isVisible(), true);
  await page.locator(".np-backdrop").click({ position: { x: 1, y: 1 } });
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await focused(open), true);

  await story("filedropzone--images");
  const file = {
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from("image fixture"),
  };
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(file);
  await page.getByRole("status").filter({ hasText: "Selection 1: reference.png" }).waitFor();
  await input.setInputFiles(file);
  await page.getByRole("status").filter({ hasText: "Selection 2: reference.png" }).waitFor();
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(["first"], "first.png", { type: "image/png" }));
    data.items.add(new File(["second"], "second.png", { type: "image/png" }));
    return data;
  });
  try {
    const dropzone = page.locator(".project-grounding-dropzone");
    await dropzone.dispatchEvent("dragenter", { dataTransfer: transfer });
    await dropzone.locator("span").dispatchEvent("dragenter", { dataTransfer: transfer });
    await dropzone.locator("span").dispatchEvent("dragleave", { dataTransfer: transfer });
    assert.equal(
      await dropzone.evaluate((element) => element.classList.contains("is-dragging")),
      true,
    );
    await dropzone.dispatchEvent("drop", { dataTransfer: transfer });
    await page
      .getByRole("status")
      .filter({ hasText: "Selection 3: first.png, second.png" })
      .waitFor();
    assert.equal(
      await dropzone.evaluate((element) => element.classList.contains("is-dragging")),
      false,
    );
  } finally {
    await transfer.dispose();
  }
  await story("filedropzone--disabled");
  assert.equal(await page.locator('input[type="file"]').isDisabled(), true);
  await page.locator(".project-grounding-dropzone").evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["image"], "ignored.png", { type: "image/png" }));
    element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: data }));
  });
  assert.equal(await page.getByRole("status").textContent(), "No files selected.");
  await story("filedropzone--images", "&args=multiple:false");
  await page.locator(".project-grounding-dropzone").evaluate((element) => {
    const data = new DataTransfer();
    for (const name of ["first.png", "second.png"])
      data.items.add(new File(["image"], name, { type: "image/png" }));
    element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: data }));
  });
  await page.getByRole("status").filter({ hasText: "Selection 1: first.png" }).waitFor();
  assert.equal(await page.getByRole("status").textContent(), "Selection 1: first.png");

  await story("promptcarousel--multiple");
  const prompt = page.locator(".project-prompt-sample");
  const original = await prompt.textContent();
  await page.getByRole("button", { name: "Previous sample prompt", exact: true }).click();
  assert.equal(await page.locator(".project-prompt-count").textContent(), "2 of 2");
  assert.notEqual(await prompt.textContent(), original);
  await page.getByRole("button", { name: "Next sample prompt", exact: true }).click();
  assert.equal(await prompt.textContent(), original);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text) => (window.copiedPrompt = text) },
    }),
  );
  await page.getByRole("button", { name: "Copy Prompt", exact: true }).click();
  await page.locator(".project-prompt-copy-status").filter({ hasText: "Prompt copied." }).waitFor();
  assert.equal(await page.evaluate(() => window.copiedPrompt), original);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("Clipboard unavailable");
    };
  });
  await page.getByRole("button", { name: "Copy Prompt", exact: true }).click();
  await page.locator(".project-prompt-copy-status").filter({ hasText: "Copy failed." }).waitFor();
  await story("promptcarousel--single");
  for (const direction of ["Previous", "Next"])
    assert.equal(
      await page
        .getByRole("button", { name: `${direction} sample prompt`, exact: true })
        .isDisabled(),
      true,
    );
  await story("promptcarousel--empty");
  assert.equal(await page.locator(".project-prompt-count").textContent(), "0 of 0");
  assert.equal(
    await page.getByRole("button", { name: "Copy Prompt", exact: true }).isDisabled(),
    true,
  );
  assert.equal(await page.locator(".project-prompt-sample").textContent(), "No prompts available.");

  await story("previewcard--asset");
  assert.equal(await page.locator("article > .asset-title-link").getAttribute("href"), "#example");
  assert.equal(await page.locator("article > h3").count(), 0);
  assert.equal(await page.locator("article > p").textContent(), "Editable SVG asset");
  assert.equal(await page.locator("article > small").textContent(), "mark-primary");
  await story("previewcard--source");
  assert.equal(await page.locator("article > h5").textContent(), "Source material");
  assert.equal(await page.locator("article > .asset-title-link").count(), 0);

  await story("toast--notification");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const show = page.getByRole("button", { name: "Show notification", exact: true });
  const toast = page.getByRole("status");
  await show.click();
  await page.clock.runFor(2000);
  await show.click();
  await page.clock.runFor(500);
  assert.equal(await toast.isVisible(), true, "A repeated message restarts auto-dismiss");
  await page.clock.runFor(1899);
  assert.equal(await toast.isVisible(), true, "Notification remains until its full duration");
  await page.clock.runFor(1);
  assert.equal(await toast.isVisible(), false);
  await page.clock.resume();
}

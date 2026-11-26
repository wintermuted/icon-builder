import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { verifySharedInteractions } from "./shared-interactions.mjs";
import { verifyLayoutInteractions } from "./layout-interactions.mjs";
import { verifyPrimitiveInteractions } from "./primitive-interactions.mjs";
import { verifyEditorControlInteractions } from "./editor-control-interactions.mjs";

const root = resolve(process.env.STORYBOOK_SITE_DIR ?? "dist/storybook");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
let browser;
before(async () => {
  await readFile(resolve(root, "index.html"));
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
});

for (const prefix of ["/icon-builder/storybook/", "/icon-builder/previews/pr-42/storybook/"]) {
  test(`static Storybook renders at ${prefix}`, async () => {
    const server = createServer(async (request, response) => {
      const pathname = new URL(request.url, "http://localhost").pathname;
      if (!pathname.startsWith(prefix)) {
        response.writeHead(404).end();
        return;
      }
      const file = resolve(root, decodeURIComponent(pathname.slice(prefix.length)) || "index.html");
      if (!file.startsWith(root + sep)) {
        response.writeHead(403).end();
        return;
      }
      try {
        const content = await readFile(file);
        response.writeHead(200, {
          "Content-Type": types[extname(file)] ?? "application/octet-stream",
        });
        response.end(content);
      } catch (error) {
        if (error.code === "ENOENT") response.writeHead(404).end();
        else {
          console.error("Storybook test server failed", error);
          response.writeHead(500).end();
        }
      }
    });
    await new Promise((accept, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", accept);
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}${prefix}`;
    try {
      const indexResponse = await page.request.get(`${base}index.json`);
      assert.equal(indexResponse.status(), 200);
      const index = await indexResponse.json();
      const stories = Object.values(index.entries).filter((entry) => entry.type === "story");
      assert.equal(stories.length, 72);
      const docs = Object.values(index.entries).filter((entry) => entry.type === "docs");
      assert.equal(docs.length, 32);
      for (const entry of stories) {
        await page.goto(`${base}iframe.html?id=${entry.id}&viewMode=story`);
        await page.locator("#storybook-root > *").first().waitFor();
        assert.equal(await page.locator("#error-message").isVisible(), false, entry.id);
        if (["shared-diagram--workflow", "shared-diagrams--populated"].includes(entry.id)) {
          await page.locator(".mermaid svg").waitFor();
        }
        if (
          [
            "shared-diagram--invalid-source",
            "shared-diagrams--unavailable",
            "shared-previewboundary--failed",
          ].includes(entry.id)
        ) {
          await page.getByRole("alert").waitFor();
        }
      }
      for (const entry of docs) {
        await page.goto(`${base}?path=/docs/${entry.id}`);
        await page
          .frameLocator("#storybook-preview-iframe")
          .getByRole("heading", { name: entry.title.split("/").at(-1), exact: true })
          .waitFor();
      }
      await verifySharedInteractions(page, base);
      await verifyLayoutInteractions(page, base);
      await verifyPrimitiveInteractions(page, base);
      await verifyEditorControlInteractions(page, base);
      assert.deepEqual(errors, [], "No uncaught runtime errors at a nested Pages path");
    } finally {
      await context.close();
      server.closeAllConnections();
      await new Promise((accept, reject) =>
        server.close((error) => (error ? reject(error) : accept())),
      );
    }
  });
}

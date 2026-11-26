import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../../../", import.meta.url));

test("Vite serves the preview URL, repository data, and existing backend API", async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    server: { host: "127.0.0.1", port: 0, strictPort: true },
    optimizeDeps: { noDiscovery: true },
  });
  try {
    await server.listen();
    const address = server.httpServer.address();
    const url = `http://127.0.0.1:${address.port}`;
    const redirect = await fetch(`${url}/?theme=dark`, { redirect: "manual" });
    assert.equal(redirect.status, 302);
    assert.equal(redirect.headers.get("location"), "/preview/index.html?theme=dark");
    const html = await (await fetch(`${url}/preview/index.html`)).text();
    assert.match(html, /@vite\/client/);
    assert.match(html, /main\.tsx/);
    const manifest = await (await fetch(`${url}/manifests/assets.json`)).json();
    const expected = JSON.parse(await readFile(`${root}manifests/assets.json`, "utf8"));
    assert.deepEqual(manifest, expected);
    const response = await fetch(`${url}/~asset`, { method: "POST", body: "not JSON" });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid JSON" });
    const specs = await (await fetch(`${url}/preview/spec-index.json`)).json();
    assert.ok(Array.isArray(specs.diagrams));

    const { serveStaticFile, parseServerArgs } = await server.ssrLoadModule(
      "/packages/preview-server/src/config.ts",
    );
    assert.equal(parseServerArgs(["--built"]).built, true);
    const fixture = await mkdtemp(join(tmpdir(), "icon-builder-vite-output-"));
    try {
      const files = {
        "dist/preview-app/preview/index.html": "<html><body>Built app</body></html>",
        "dist/preview-app/preview/assets/app.js": "export const built = true;",
        "preview/spec-index.json": '{"diagrams":[]}',
        "assets/svg/example.svg": "<svg></svg>",
      };
      for (const [path, content] of Object.entries(files)) {
        const target = join(fixture, path);
        await mkdir(join(target, ".."), { recursive: true });
        await writeFile(target, content);
      }
      for (const [path, expectedBody] of [
        ["/preview/index.html", files["dist/preview-app/preview/index.html"]],
        ["/preview/assets/app.js", files["dist/preview-app/preview/assets/app.js"]],
        ["/preview/spec-index.json", files["preview/spec-index.json"]],
        ["/assets/svg/example.svg", files["assets/svg/example.svg"]],
      ]) {
        const response = {
          body: "",
          writeHead(status) {
            assert.equal(status, 200);
          },
          end(body) {
            this.body = String(body);
          },
        };
        await serveStaticFile({ url: path }, response, {
          root: fixture,
          built: true,
          reloadSnippet: "",
        });
        assert.equal(response.body, expectedBody);
      }
    } finally {
      await rm(fixture, { recursive: true });
    }
  } finally {
    await server.close();
  }
});

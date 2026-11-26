import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixtureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
<title>Editor fixture</title>
<rect id="first" x="20" y="20" width="50" height="50" fill="#112233"/>
<rect id="second" x="110" y="25" width="40" height="40" fill="#445566"/>
<polygon id="triangle" points="20,130 80,130 50,190" fill="#778899"/>
</svg>`;
const assets = ["fixture", "other"].map((id) => ({
  id,
  label: id === "fixture" ? "Editor fixture" : "Other asset",
  source: `assets/svg/${id}.svg`,
  project: "Fixture Project",
  variants: [{ size: 64 }],
}));
const project = {
  name: "Fixture Project",
  slug: "fixture-project",
  primaryAssetId: "fixture",
  samplePrompts: ["Draw a mark"],
  iconSlots: { favicon: { assetId: "fixture" } },
  agentSteer: {
    notes: ["Keep the mark editable"],
    favoriteColors: ["#112233"],
    customColors: [],
    sources: [
      {
        kind: "image",
        src: "assets/svg/steering.svg",
        title: "Reference",
        palette: [{ hex: "#445566", percentage: 40 }],
      },
    ],
  },
};
const contentTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

export async function startPreviewTestServer({ bundle = false } = {}) {
  const requests = [];
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    try {
      if (request.method === "POST") {
        let body = "";
        for await (const chunk of request) body += chunk;
        const payload = JSON.parse(body);
        requests.push({ path: pathname, payload });
        const result =
          pathname === "/~asset"
            ? { source: "assets/svg/fixture.svg" }
            : { favoriteColors: ["#112233", "#445566"], customColors: [] };
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(result));
        return;
      }
      if (pathname === "/manifests/assets.json" || pathname === "/preview/spec-index.json") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
          JSON.stringify(
            pathname.includes("assets.json") ? { assets, projects: [project] } : { diagrams: [] },
          ),
        );
        return;
      }
      if (/^\/assets\/svg\/(fixture|other|steering)\.svg$/.test(pathname)) {
        response.writeHead(200, { "Content-Type": "image/svg+xml" });
        response.end(
          fixtureSvg.replace(
            "<svg ",
            `<svg data-fixture="${pathname.includes("other") ? "other" : "fixture"}" `,
          ),
        );
        return;
      }
      const sourceModule = !bundle && pathname.startsWith("/preview/") && pathname.endsWith(".js");
      const relative = sourceModule
        ? `packages/preview-app/src/${pathname.slice("/preview/".length).replace(/\.js$/, ".ts")}`
        : pathname.slice(1);
      const path = resolve(root, relative);
      if (!path.startsWith(resolve(root) + sep)) {
        response.writeHead(403).end();
        return;
      }
      let content = await readFile(path, "utf8");
      if (sourceModule) content = stripTypeScriptTypes(content, { mode: "strip" });
      response.writeHead(200, {
        "Content-Type": sourceModule
          ? "text/javascript"
          : contentTypes[extname(path)] || "text/plain",
      });
      response.end(content);
    } catch (error) {
      if (error.code === "ENOENT") response.writeHead(404).end();
      else {
        console.error("Preview test server failed", error);
        response.writeHead(500).end(error.message);
      }
    }
  });
  await new Promise((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    requests,
    async close() {
      server.closeAllConnections();
      await new Promise((accept, reject) =>
        server.close((error) => (error ? reject(error) : accept())),
      );
    },
  };
}

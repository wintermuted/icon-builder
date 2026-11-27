import type { IncomingMessage, ServerResponse } from "node:http";
import type { CanvasService } from "./canvas-service.js";
import { CanvasFault } from "./canvas-files.js";

async function body(req: IncomingMessage) {
  req.setEncoding("utf8");
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 3 * 1024 * 1024)
      throw new CanvasFault("request_too_large", "Canvas requests must be under 3 MB.", 413);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new CanvasFault("invalid_json", "Invalid JSON.");
  }
}

export function canvasHttp(
  service: CanvasService,
  legacy: (req: IncomingMessage, res: ServerResponse) => Promise<void>,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (!url.pathname.startsWith("/~")) return false;
    try {
      if (
        req.headers.host !== new URL(service.origin).host ||
        (req.headers.origin && req.headers.origin !== service.origin)
      )
        throw new CanvasFault("invalid_origin", "Canvas request origin does not match.", 403);
      const token = String(
        req.headers["x-icon-canvas-token"] || url.searchParams.get("panel") || "",
      );
      service.panel(token);
      if (req.method === "POST") req.setEncoding("utf8");
      if (url.pathname === "/~canvas/events" && req.method === "GET") {
        service.connect(token, res);
        return true;
      }
      let result: unknown;
      if (url.pathname === "/~canvas/asset" && req.method === "GET") {
        const id = url.searchParams.get("id") || "";
        result = { ...(await service.files.read(id)), draft: await service.readDraft(id) };
        service.claim(token, id);
      } else if (req.method === "POST") {
        if (!req.headers["x-icon-canvas-token"])
          throw new CanvasFault("missing_token", "Canvas write token required.", 403);
        if (url.pathname === "/~canvas/ack") result = service.acknowledge(token, await body(req));
        else if (url.pathname === "/~canvas/release") {
          const input = await body(req);
          const panel = service.panel(token);
          if (panel.assetId === input.id) panel.assetId = undefined;
          result = {};
        } else if (url.pathname === "/~canvas/draft")
          result = await service.draft(await body(req), token);
        else if (url.pathname === "/~asset") {
          const input = await body(req);
          result = await service.guarded(
            async () => {
              const saved = await service.files.save(input);
              await service.draft({ id: input.id, discard: true });
              return { ok: true, ...saved };
            },
            { savingToken: token, requesterToken: token },
          );
        } else if (url.pathname === "/~scaffold") {
          const input = await body(req);
          result = await service.guarded(
            async () => {
              const created = await service.files.createProject(input);
              return {
                ok: true,
                ...created,
                svgDir: `assets/svg/${created.slug}/`,
                groundingDir: `assets/svg/${created.slug}/grounding/`,
                documentation: `assets/svg/${created.slug}/README.md`,
              };
            },
            { requesterToken: token },
          );
        } else {
          await service.guarded(() => legacy(req, res), {
            requesterToken: token,
            changed: () => res.statusCode >= 200 && res.statusCode < 300,
          });
          return true;
        }
      } else {
        await legacy(req, res);
        return true;
      }
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(error instanceof CanvasFault ? error.status : 500, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: error.message, code: error.code || "canvas_server_error" }));
    }
    return true;
  };
}

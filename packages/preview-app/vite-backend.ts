import type { Plugin } from "vite";
import { createRequestHandler } from "../preview-server/src/routes.js";
import { buildSpecIndex } from "../workflows/src/build-spec-index.js";
import { CanvasService } from "../preview-server/src/canvas-service.js";
import { canvasHttp } from "../preview-server/src/canvas-http.js";

export function createPreviewBackend(root: string, canvasMode = false): Plugin {
  const canvas = canvasMode ? new CanvasService(root) : undefined;
  return {
    name: "preview-backend",
    api: { canvas },
    async configureServer(server) {
      await buildSpecIndex(root);
      let suppressUntil = 0;
      const handler = createRequestHandler({
        root,
        reload: {
          suppressFor(milliseconds: number) {
            suppressUntil = Date.now() + milliseconds;
          },
          connect() {
            throw new Error("Vite handles preview reloads");
          },
        },
      });
      const embeddedHandler = canvas && canvasHttp(canvas, handler);
      server.middlewares.use((req, res, next) => {
        if (req.url === "/" || req.url?.startsWith("/?")) {
          const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
          res.writeHead(302, { Location: `/preview/index.html${query}` }).end();
          return;
        }
        if (req.url?.startsWith("/~")) {
          if (req.url === "/~reload") {
            res.writeHead(404).end();
            return;
          }
          if (embeddedHandler) void embeddedHandler(req, res);
          else void handler(req, res);
        } else next();
      });
      const onChange = async (path: string) => {
        if (canvasMode) return;
        if (
          path.startsWith(`${root}specs`) ||
          path.includes("/specs/") ||
          path.includes("\\specs\\")
        ) {
          try {
            await buildSpecIndex(root);
            server.ws.send({ type: "full-reload" });
          } catch (error) {
            server.config.logger.error(`Spec refresh failed: ${error}`);
          }
        } else if (
          Date.now() >= suppressUntil &&
          (path.endsWith("assets.json") || /[\\/]assets[\\/]svg[\\/]/.test(path))
        ) {
          server.ws.send({ type: "full-reload" });
        }
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        if (address && typeof address === "object")
          server.config.logger.info(
            `Preview server running at http://localhost:${address.port}/preview/index.html`,
          );
      });
      server.httpServer?.once("close", () => {
        server.watcher.off("change", onChange);
        server.watcher.off("add", onChange);
        server.watcher.off("unlink", onChange);
      });
    },
  };
}

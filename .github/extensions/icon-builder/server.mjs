import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";

const protocolWrite = process.stdout.write.bind(process.stdout);
const send = (message) => protocolWrite(`${JSON.stringify(message)}\n`);
process.stdout.write = process.stderr.write.bind(process.stderr);

const root = process.env.ICON_BUILDER_ROOT;
const lockPath = join(root, "node_modules", ".icon-builder-canvas.lock");
let server;
let service;
let lock;
let closing = false;

async function shutdown() {
  if (closing) return;
  closing = true;
  for (const panel of service?.panels.values() || []) panel.stream?.end();
  server?.httpServer?.closeAllConnections();
  await server?.close();
  if (lock) {
    await lock.close();
    await unlink(lockPath);
  }
}

process.stdin.once("end", () => {
  void shutdown().then(
    () => process.exit(0),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
});
process.stdout.once("error", (error) => {
  console.error(`Canvas provider transport closed: ${error.message}`);
  void shutdown().then(
    () => process.exit(1),
    () => process.exit(1),
  );
});

try {
  const [major, minor, patch] = process.versions.node.split(".").map(Number);
  if (major < 26 || (major === 26 && (minor < 13 || (minor === 13 && patch < 1))))
    throw new Error("Icon Builder requires Node.js 26.13.1 or later.");
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const pid = Number(await readFile(lockPath, "utf8"));
    if (!Number.isSafeInteger(pid) || pid <= 0)
      throw new Error("Invalid canvas lock; inspect node_modules/.icon-builder-canvas.lock.");
    try {
      process.kill(pid, 0);
      throw new Error(
        "This worktree already has an Icon Builder canvas provider. Close it before opening another.",
      );
    } catch (probe) {
      if (probe.code !== "ESRCH") throw probe;
    }
    await unlink(lockPath);
    lock = await open(lockPath, "wx");
  }
  await lock.writeFile(String(process.pid));
  const require = createRequire(join(root, "packages", "preview-app", "package.json"));
  const { createServer } = await import(pathToFileURL(require.resolve("vite")).href);
  server = await createServer({
    root,
    cacheDir: join(root, "node_modules", ".vite-copilot-canvas"),
    configFile: join(root, "packages", "preview-app", "vite.config.ts"),
    mode: "copilot-canvas",
    server: { host: "127.0.0.1", port: 0, strictPort: true, hmr: false },
  });
  await server.listen();
  service = server.config.plugins.find((plugin) => plugin.name === "preview-backend").api.canvas;
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  service.origin = origin;
  createInterface({ input: process.stdin }).on("line", async (line) => {
    const { id, method, input } = JSON.parse(line);
    try {
      const result = await service.invoke(method, input);
      send({ id, result, instances: service.panels.size });
    } catch (error) {
      send({
        id,
        error: { code: error.code || "icon_builder_error", message: error.message },
        instances: service.panels.size,
      });
    }
  });
  send({ ready: true });
} catch (error) {
  console.error(
    `Canvas startup failed: ${error.message}. Run npm run install:deps if dependencies are missing.`,
  );
  await shutdown();
  process.exit(1);
}

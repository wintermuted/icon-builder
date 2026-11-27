import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, realpath, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import type { ServerResponse } from "node:http";
import { readManifest } from "./manifest.js";
import { CanvasFault, CanvasFiles, replaceFile, slug } from "./canvas-files.js";

interface Panel {
  token: string;
  assetId?: string;
  stream?: ServerResponse;
  pending?: { id: string; accept: (clean: boolean) => void };
}

export class CanvasService {
  panels = new Map<string, Panel>();
  files: CanvasFiles;
  origin = "";
  generation = randomUUID();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(public root: string) {
    this.files = new CanvasFiles(root);
  }

  serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work);
    this.queue = next.catch(() => {});
    return next;
  }

  panel(token: string) {
    const panel = [...this.panels.values()].find((item) => item.token === token);
    if (!panel) throw new CanvasFault("unknown_panel", "Reopen the Icon Builder canvas.", 403);
    return panel;
  }

  event(panel: Panel, event: object) {
    panel.stream?.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  connect(token: string, response: ServerResponse) {
    const panel = this.panel(token);
    panel.stream?.end();
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    panel.stream = response;
    this.event(panel, { type: "connected", generation: this.generation });
    const timer = setInterval(() => response.write(": heartbeat\n\n"), 10000);
    response.on("close", () => {
      clearInterval(timer);
      if (panel.stream === response) {
        panel.stream = undefined;
        panel.pending?.accept(false);
      }
    });
  }

  async guarded<T>(work: () => Promise<T>, savingToken?: string) {
    return this.serial(async () => {
      let changed = false;
      try {
        const checks = [...this.panels.values()].map(
          (panel) =>
            new Promise<boolean>((accept) => {
              if (!panel.stream || panel.stream.destroyed) return accept(false);
              const id = randomUUID();
              const timer = setTimeout(() => accept(false), 5000);
              panel.pending = {
                id,
                accept: (clean) => {
                  clearTimeout(timer);
                  accept(clean);
                },
              };
              this.event(panel, { type: "prepare", id, saving: panel.token === savingToken });
            }),
        );
        if ((await Promise.all(checks)).some((clean) => !clean))
          throw new CanvasFault(
            "editor_busy",
            "Save or discard unsaved canvas edits, and reconnect every open panel, before writing.",
            409,
          );
        const result = await work();
        changed = true;
        return result;
      } finally {
        for (const panel of this.panels.values()) {
          panel.pending = undefined;
          this.event(panel, { type: "release", changed, saving: panel.token === savingToken });
        }
      }
    });
  }

  acknowledge(token: string, input: { id: string; clean: boolean }) {
    const pending = this.panel(token).pending;
    if (!pending || pending.id !== input.id)
      throw new CanvasFault(
        "expired_request",
        "Editor synchronization expired. Retry after reconnecting.",
        409,
      );
    pending.accept(input.clean === true);
    return {};
  }

  async draftPath(id: string) {
    const filename = `${slug(id)}.json`;
    let directory = await realpath(this.root);
    for (const segment of ["outputs", "canvas", "drafts"]) {
      directory = resolve(directory, segment);
      await mkdir(directory).catch((error) => {
        if (error.code !== "EEXIST") throw error;
      });
      const entry = await lstat(directory);
      if (entry.isSymbolicLink() || !entry.isDirectory())
        throw new CanvasFault(
          "invalid_path",
          "Canvas drafts require ordinary worktree directories.",
        );
    }
    const path = resolve(directory, filename);
    try {
      if ((await lstat(path)).isSymbolicLink())
        throw new CanvasFault("invalid_path", "Canvas draft files cannot be symbolic links.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return path;
  }

  async readDraft(id: string) {
    try {
      return JSON.parse(await readFile(await this.draftPath(id), "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return null;
    }
  }

  claim(token: string, id: string) {
    const panel = this.panel(token);
    if ([...this.panels.values()].some((other) => other !== panel && other.assetId === id))
      throw new CanvasFault(
        "asset_open",
        "This asset is already open in another canvas panel. Navigate that panel away or close it first.",
        409,
      );
    panel.assetId = id;
  }

  async draft(
    input: { id: string; svg?: string; revision?: string; discard?: boolean },
    token?: string,
  ) {
    if (token) this.claim(token, input.id);
    await this.files.read(input.id);
    const path = await this.draftPath(input.id);
    if (input.discard) {
      await unlink(path).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    } else {
      if (
        typeof input.svg !== "string" ||
        Buffer.byteLength(input.svg) > 2 * 1024 * 1024 ||
        typeof input.revision !== "string"
      )
        throw new CanvasFault(
          "invalid_draft",
          "Draft needs SVG content and its original revision.",
        );
      await replaceFile(path, JSON.stringify({ svg: input.svg, revision: input.revision }));
    }
    return {};
  }

  async invoke(method: string, input) {
    if (method === "open") {
      return this.serial(async () => {
        const manifest = await readManifest(this.root);
        let hash = "#logos";
        if (input.assetId) {
          if (!manifest.assets.some((asset) => asset.id === input.assetId))
            throw new CanvasFault("asset_not_found", `Unknown asset: ${input.assetId}`, 404);
          hash = `#asset/${encodeURIComponent(input.assetId)}`;
        } else if (input.project) {
          if (!manifest.projects.some((project) => project.name === input.project))
            throw new CanvasFault("project_not_found", `Unknown project: ${input.project}`, 404);
          hash = `#project/${encodeURIComponent(input.project)}`;
        }
        if (!this.panels.has(input.instanceId))
          this.panels.set(input.instanceId, { token: randomUUID() });
        return {
          url: `${this.origin}/preview/index.html?canvas=1&panel=${this.panels.get(input.instanceId).token}${hash}`,
        };
      });
    }
    if (method === "close") {
      const panel = this.panels.get(input.instanceId);
      panel?.pending?.accept(false);
      panel?.stream?.end();
      this.panels.delete(input.instanceId);
      return {};
    }
    if (method === "list_projects") return { projects: (await readManifest(this.root)).projects };
    if (method === "list_assets") {
      const { assets } = await readManifest(this.root);
      return {
        assets: assets.filter((asset) => !input.project || asset.project === input.project),
      };
    }
    if (method === "read_asset") return this.files.read(input.id);
    if (["save_asset", "create_asset", "create_project"].includes(method))
      return this.guarded(async () => {
        const draftIds = method === "save_asset" ? [input.id] : [];
        for (const id of draftIds) {
          if (await this.readDraft(id))
            throw new CanvasFault(
              "unsaved_draft",
              "This asset has a recovered draft. Save or discard it in the canvas first.",
              409,
            );
        }
        if (method === "save_asset") return this.files.save(input);
        if (method === "create_asset") return this.files.create(input);
        return this.files.createProject(input);
      });
    throw new CanvasFault("unknown_action", `Unknown action: ${method}`, 404);
  }
}

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export class CanvasProvider {
  constructor(root) {
    this.root = fileURLToPath(root);
    this.instances = 0;
    this.sequence = 0;
    this.pending = new Map();
  }

  async start() {
    if (this.starting) return this.starting;
    this.starting = new Promise((resolve, reject) => {
      const child = spawn(
        process.env.ICON_BUILDER_NODE || "node",
        [fileURLToPath(new URL("./server.mjs", import.meta.url))],
        {
          cwd: this.root,
          stdio: ["pipe", "pipe", "pipe"],
          env: { ...process.env, ICON_BUILDER_ROOT: this.root },
        },
      );
      this.child = child;
      let diagnostics = "";
      const capture = (chunk) => {
        diagnostics = `${diagnostics}${chunk}`.slice(-8000);
      };
      child.stderr.on("data", capture);
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Icon Builder startup timed out. ${diagnostics}`));
      }, 45000);
      const fail = (error) => {
        clearTimeout(timeout);
        reject(error);
        this.starting = null;
        this.child = null;
        for (const { reject: rejectRequest, timer } of this.pending.values()) {
          clearTimeout(timer);
          rejectRequest(error);
        }
        this.pending.clear();
      };
      child.once("error", fail);
      child.stdin.on("error", fail);
      child.once("exit", (code) => {
        fail(new Error(`Icon Builder server stopped (${code}). ${diagnostics}`));
      });
      createInterface({ input: child.stdout }).on("line", (line) => {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          fail(new Error(`Invalid canvas server response: ${line}`));
          child.kill();
          return;
        }
        if (message.ready) {
          clearTimeout(timeout);
          resolve();
        } else if (message.id) {
          const request = this.pending.get(message.id);
          if (!request) return;
          this.pending.delete(message.id);
          clearTimeout(request.timer);
          this.instances = message.instances;
          if (message.error)
            request.reject(
              Object.assign(new Error(message.error.message), { code: message.error.code }),
            );
          else request.resolve(message.result);
        }
      });
    });
    return this.starting;
  }

  async request(method, input) {
    await this.start();
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error("Icon Builder request timed out; inspect the canvas before retrying a write."),
        );
      }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(`${JSON.stringify({ id, method, input })}\n`);
    });
  }

  async stop() {
    const child = this.child;
    if (!child) return;
    await new Promise((resolve) => {
      child.once("exit", resolve);
      const timer = setTimeout(() => child.kill(), 5000);
      child.once("exit", () => clearTimeout(timer));
      child.stdin.end();
    });
  }
}

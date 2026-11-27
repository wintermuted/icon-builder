import { open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";

export async function acquireWorktreeLock(root) {
  const path = join(root, "node_modules", ".icon-builder-canvas.lock");
  const recoveryPath = `${path}.recovery`;
  let recovery;
  let owner;
  try {
    try {
      recovery = await open(recoveryPath, "wx");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      throw new Error(
        `Canvas ownership is being checked. Retry; if this persists, inspect ${recoveryPath} before removing an abandoned recovery lock.`,
      );
    }
    await recovery.writeFile(String(process.pid));
    try {
      owner = await open(path, "wx");
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const pid = Number(await readFile(path, "utf8"));
      if (!Number.isSafeInteger(pid) || pid <= 0)
        throw new Error(`Invalid canvas lock; inspect ${path}.`);
      try {
        process.kill(pid, 0);
        throw new Error(
          "This worktree already has an Icon Builder canvas provider. Close it before opening another.",
        );
      } catch (probe) {
        if (probe.code !== "ESRCH") throw probe;
      }
      await unlink(path);
      owner = await open(path, "wx");
    }
    await owner.writeFile(String(process.pid));
  } catch (error) {
    if (owner) {
      await owner.close();
      await unlink(path);
    }
    throw error;
  } finally {
    if (recovery) {
      await recovery.close();
      await unlink(recoveryPath);
    }
  }
  return async () => {
    await owner.close();
    await unlink(path);
  };
}

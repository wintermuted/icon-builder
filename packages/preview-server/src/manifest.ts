import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

export function manifestPath(root) {
  return join(root, "manifests", "assets.json");
}

export async function readManifest(root) {
  return JSON.parse(await readFile(manifestPath(root), "utf-8"));
}

export async function writeManifest(root, manifest) {
  await replaceFile(manifestPath(root), JSON.stringify(manifest, null, 2) + "\n");
}

export async function replaceFile(path: string, content: string) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: "wx" });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export function findProject(manifest, name) {
  return manifest.projects.find((item) => item.name === name);
}

export function pruneFavoriteColors(project) {
  const availableColors = new Set([
    ...(project.agentSteer?.sources || []).flatMap((source) =>
      (source.palette || []).map((color) => String(color.hex || "").toUpperCase()),
    ),
    ...(project.agentSteer?.customColors || []).map((color) => String(color).toUpperCase()),
  ]);
  project.agentSteer.favoriteColors = (project.agentSteer.favoriteColors || [])
    .map((color) => String(color).toUpperCase())
    .filter((color) => availableColors.has(color));
}

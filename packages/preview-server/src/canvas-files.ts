import { createHash } from "node:crypto";
import { lstat, realpath, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { readManifest, writeManifest, replaceFile } from "./manifest.js";
export { replaceFile } from "./manifest.js";
import { scaffoldProject } from "./scaffolding.js";
import { DOMParser } from "@xmldom/xmldom";

export class CanvasFault extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const revision = (svg: string) => createHash("sha256").update(svg).digest("hex");
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function slug(value: string) {
  if (typeof value !== "string" || !slugPattern.test(value))
    throw new CanvasFault("invalid_id", "Use a nonempty kebab-case identifier.");
  return value;
}

export function validateSvg(svg: string) {
  const externalResource = (value: string) =>
    /@import|\\|url\s*\(/i.test(
      value.replace(/url\(\s*(?:"#[^"]+"|'#[^']+'|#[^)'"\s]+)\s*\)/gi, ""),
    );
  if (
    typeof svg !== "string" ||
    Buffer.byteLength(svg) > 2 * 1024 * 1024 ||
    /<!DOCTYPE|<!ENTITY/i.test(svg)
  )
    throw new CanvasFault(
      "invalid_svg",
      "Provide a complete SVG under 2 MB without scripts, event handlers, or embedded HTML.",
    );
  let document: ReturnType<DOMParser["parseFromString"]>;
  try {
    document = new DOMParser({
      onError: (_level, message) => {
        throw new Error(message);
      },
    }).parseFromString(svg, "image/svg+xml");
  } catch (error) {
    throw new CanvasFault("invalid_svg", `Malformed SVG: ${error.message}`);
  }
  if (document.documentElement?.localName !== "svg")
    throw new CanvasFault("invalid_svg", "The document root must be SVG.");
  for (const element of Array.from(document.getElementsByTagName("*"))) {
    if (
      element.namespaceURI !== "http://www.w3.org/2000/svg" ||
      [
        "script",
        "foreignobject",
        "animate",
        "animatemotion",
        "animatetransform",
        "set",
        "discard",
      ].includes(element.localName.toLowerCase())
    )
      throw new CanvasFault(
        "invalid_svg",
        "Only static SVG elements without scripting or embedded HTML are supported.",
      );
    for (const attribute of Array.from(element.attributes)) {
      if (
        /^on/i.test(attribute.localName) ||
        /(?:javascript|vbscript)\s*:/i.test(attribute.value) ||
        externalResource(attribute.value) ||
        (attribute.localName === "href" &&
          !/^(?:#|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(attribute.value))
      )
        throw new CanvasFault(
          "invalid_svg",
          "SVG attributes cannot execute code or load external resources.",
        );
    }
    if (element.localName === "style" && externalResource(element.textContent || ""))
      throw new CanvasFault("invalid_svg", "SVG styles cannot import or load external resources.");
  }
}

export async function canonicalPath(root: string, source: string) {
  if (
    typeof source !== "string" ||
    !/^assets\/svg\/[^\\]+\.svg$/i.test(source) ||
    source.split("/").some((part) => part === ".." || part === ".")
  )
    throw new CanvasFault("invalid_path", "SVG source must be under assets/svg.");
  const base = await realpath(resolve(root, "assets", "svg"));
  if (base !== resolve(await realpath(root), "assets", "svg"))
    throw new CanvasFault(
      "invalid_path",
      "Canvas asset directories must remain inside this worktree.",
    );
  const target = resolve(root, source);
  const parent = await realpath(dirname(target));
  const inside = relative(base, parent);
  if (inside.startsWith("..") || isAbsolute(inside))
    throw new CanvasFault("invalid_path", "SVG source resolves outside assets/svg.");
  try {
    if ((await lstat(target)).isSymbolicLink())
      throw new CanvasFault("invalid_path", "Canvas SVG targets cannot be symbolic links.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return target;
}

export class CanvasFiles {
  constructor(public root: string) {}

  async read(id: string) {
    const manifest = await readManifest(this.root);
    const asset = manifest.assets.find((item) => item.id === id);
    if (!asset) throw new CanvasFault("asset_not_found", `Unknown asset: ${id}`, 404);
    const svg = await readFile(await canonicalPath(this.root, asset.source), "utf8");
    return { asset, svg, revision: revision(svg) };
  }

  async save(input: { id: string; svg: string; expectedRevision: string }) {
    validateSvg(input.svg);
    const current = await this.read(input.id);
    if (current.revision !== input.expectedRevision)
      throw new CanvasFault(
        "revision_conflict",
        "SVG changed on disk. Read the current revision before saving.",
        409,
      );
    const svg = input.svg.endsWith("\n") ? input.svg : `${input.svg}\n`;
    await replaceFile(await canonicalPath(this.root, current.asset.source), svg);
    return { source: current.asset.source, revision: revision(svg) };
  }

  async createProject(input: { name: string; slug: string }) {
    slug(input.slug);
    if (!input.name?.trim() || input.name.length > 100)
      throw new CanvasFault(
        "invalid_project",
        "A project name between 1 and 100 characters is required.",
      );
    const manifest = await readManifest(this.root);
    if (
      manifest.projects.some(
        (item) =>
          item.name.toLowerCase() === input.name.trim().toLowerCase() || item.slug === input.slug,
      )
    )
      throw new CanvasFault("duplicate_project", "Project name or slug already exists.", 409);
    const base = await realpath(resolve(this.root, "assets", "svg"));
    if (base !== resolve(this.root, "assets", "svg"))
      throw new CanvasFault(
        "invalid_path",
        "Canvas project creation requires a canonical assets/svg directory.",
      );
    try {
      await lstat(resolve(base, input.slug));
      throw new CanvasFault("duplicate_project", "Project directory already exists.", 409);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    try {
      return await scaffoldProject(this.root, input.name.trim(), input.slug);
    } catch (error) {
      try {
        await unlink(resolve(base, input.slug, "README.md")).catch((failure) => {
          if (failure.code !== "ENOENT") throw failure;
        });
        await rmdir(resolve(base, input.slug, "grounding")).catch((failure) => {
          if (failure.code !== "ENOENT") throw failure;
        });
        await rmdir(resolve(base, input.slug));
      } catch (rollback) {
        throw new CanvasFault(
          "partial_write",
          `Project creation failed: ${error.message}. Cleanup failed: ${rollback.message}`,
          500,
        );
      }
      throw error;
    }
  }

  async create(input: {
    id: string;
    project: string;
    label: string;
    svg: string;
    variants: { size: number; theme: string }[];
  }) {
    slug(input.id);
    validateSvg(input.svg);
    if (
      !input.label?.trim() ||
      !Array.isArray(input.variants) ||
      !input.variants.length ||
      input.variants.length > 32 ||
      input.variants.some(
        (v) =>
          !Number.isInteger(v.size) ||
          v.size < 1 ||
          v.size > 4096 ||
          !["light", "dark"].includes(v.theme),
      )
    )
      throw new CanvasFault(
        "invalid_asset",
        "A label and explicit size/theme variants are required.",
      );
    const manifest = await readManifest(this.root);
    const project = manifest.projects.find((item) => item.name === input.project);
    if (!project)
      throw new CanvasFault(
        "project_not_found",
        "Create the project before registering an asset.",
        404,
      );
    const projectSlug = slug(
      project.slug ||
        project.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
    );
    if (manifest.assets.some((item) => item.id === input.id))
      throw new CanvasFault("duplicate_asset", "Asset ID already exists.", 409);
    const source = `assets/svg/${projectSlug}/${input.id}.svg`;
    const target = await canonicalPath(this.root, source);
    const svg = input.svg.endsWith("\n") ? input.svg : `${input.svg}\n`;
    const asset = {
      id: input.id,
      label: input.label.trim(),
      project: project.name,
      source,
      variants: input.variants,
    };
    await writeFile(target, svg, { flag: "wx" });
    try {
      manifest.assets.push(asset);
      await writeManifest(this.root, manifest);
    } catch (error) {
      try {
        await unlink(target);
      } catch (rollback) {
        throw new CanvasFault(
          "partial_write",
          `Manifest update failed: ${error.message}. SVG rollback failed: ${rollback.message}`,
          500,
        );
      }
      throw error;
    }
    return { asset, revision: revision(svg) };
  }
}

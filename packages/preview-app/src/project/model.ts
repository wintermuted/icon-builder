import { appState } from "../app-state.js";

export const PROJECT_ICON_SLOTS = [
  { id: "favicon", label: "Favicon", usage: "Browser tabs and bookmarks" },
  { id: "appIcon", label: "App Icon", usage: "PWA launcher and app switchers" },
  { id: "logoMark", label: "Logo Mark", usage: "Compact nav and small brand surfaces" },
  { id: "wordmark", label: "Wordmark", usage: "Headers, login, and marketing bars" },
  { id: "socialPreview", label: "Social Preview", usage: "Open Graph and shared links" },
];

export const COMMON_PREVIEW_SIZES = [
  16, 20, 24, 29, 32, 40, 48, 64, 72, 96, 120, 128, 144, 152, 167, 180, 192, 256, 384, 512,
];

export function projectRouteHref(projectName) {
  return `#project/${encodeURIComponent(projectName)}`;
}

export function sourceRouteHref(projectName, sourcePath) {
  return `#source/${encodeURIComponent(projectName)}/${encodeURIComponent(sourcePath)}`;
}

export function resolveAssetPath(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (String(value).startsWith("/")) return value;
  return `../${value}`;
}

export function normalizeProjectSteer(projectName) {
  const projectMeta = appState.projectMetaByName.get(projectName);
  if (!projectMeta || !projectMeta.agentSteer) {
    return { notes: [], sources: [], favoriteColors: [], customColors: [] };
  }

  const fromManifest = projectMeta.agentSteer;

  const notes = Array.isArray(fromManifest.notes)
    ? fromManifest.notes.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const sources = Array.isArray(fromManifest.sources) ? fromManifest.sources : [];
  const favoriteColors = Array.isArray(fromManifest.favoriteColors)
    ? fromManifest.favoriteColors
        .map((color) => String(color).toUpperCase())
        .filter((color) => /^#[0-9A-F]{6}$/.test(color))
    : [];
  const customColors = Array.isArray(fromManifest.customColors)
    ? fromManifest.customColors
        .map((color) => String(color).toUpperCase())
        .filter((color) => /^#[0-9A-F]{6}$/.test(color))
    : [];
  return { notes, sources, favoriteColors, customColors };
}

export async function updateProjectFavoriteColor(project, color, selected, custom = false) {
  const response = await fetch("/~project-color", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, color, selected, custom }),
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || "Favorite color update failed");
  const projectMeta = appState.projectMetaByName.get(project);
  if (projectMeta) {
    projectMeta.agentSteer = {
      ...projectMeta.agentSteer,
      favoriteColors: result.favoriteColors || [],
      customColors: result.customColors || [],
    };
  }
  return result;
}

export function normalizeProjectSlots(projectName) {
  const projectMeta = appState.projectMetaByName.get(projectName);
  const slotMap =
    projectMeta?.iconSlots && typeof projectMeta.iconSlots === "object"
      ? projectMeta.iconSlots
      : {};

  return PROJECT_ICON_SLOTS.map((slot) => {
    const configured = slotMap[slot.id] || {};
    return {
      ...slot,
      title: String(configured.title || slot.label),
      note: String(configured.note || "").trim(),
      assetId: String(configured.assetId || "").trim(),
      src: String(configured.src || "").trim(),
      url: String(configured.url || "").trim(),
    };
  });
}

export function resolveSlotPreview(slot) {
  if (slot.assetId) {
    const asset = appState.assetById.get(slot.assetId);
    if (asset) {
      return {
        sourceType: "asset",
        src: resolveAssetPath(asset.source),
        label: asset.label,
        href: `#asset/${encodeURIComponent(asset.id)}`,
      };
    }
  }

  if (slot.src) {
    return {
      sourceType: "src",
      src: resolveAssetPath(slot.src),
      label: slot.src,
      href: "",
    };
  }

  if (slot.url) {
    return {
      sourceType: "url",
      src: "",
      label: slot.url,
      href: slot.url,
    };
  }

  return {
    sourceType: "empty",
    src: "",
    label: "",
    href: "",
  };
}

export function primaryProjectAsset(projectName, projectAssets) {
  const projectMeta = appState.projectMetaByName.get(projectName);
  const primaryAssetId = String(projectMeta?.primaryAssetId || "").trim();

  if (primaryAssetId) {
    const matched = projectAssets.find((asset) => asset.id === primaryAssetId);
    if (matched) {
      return matched;
    }
  }

  return projectAssets[0] || null;
}

export function projectForAsset(asset) {
  const raw = String(asset.project ?? "").trim();
  return raw || "Unassigned Project";
}

export function buildProjectAssets(assets) {
  // Seed with all manifest projects so empty ones still render
  const byProject = new Map(
    Array.from(appState.projectMetaByName.keys()).map((name) => [name, []]),
  );
  for (const asset of assets) {
    const project = projectForAsset(asset);
    if (!byProject.has(project)) {
      byProject.set(project, []);
    }
    byProject.get(project).push(asset);
  }

  return Array.from(byProject.entries())
    .map(([project, grouped]) => [project, grouped.sort((a, b) => a.label.localeCompare(b.label))])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

export function uniqueSortedSizes(asset) {
  const variantSizes = (asset.variants ?? [])
    .map((variant) => Number(variant.size))
    .filter((value) => Number.isFinite(value));
  const allSizes = [...COMMON_PREVIEW_SIZES, ...variantSizes];
  return Array.from(new Set(allSizes)).sort((a, b) => a - b);
}

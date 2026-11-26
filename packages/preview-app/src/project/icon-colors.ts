import { appState } from "../app-state.js";
import { loadAssetColors } from "../svg/analysis.js";
import { projectForAsset } from "./model.js";
import type { Asset } from "../types.js";

interface ColorUsage {
  color: string;
  projects: Map<string, Asset[]>;
}

export async function collectColorUsageAcrossAssets() {
  const entries = await Promise.all(
    appState.assetData.map(async (asset) => {
      return { asset, colors: await loadAssetColors(asset.source) };
    }),
  );
  const usage = new Map<string, ColorUsage>();
  for (const { asset, colors } of entries) {
    const project = projectForAsset(asset);
    for (const color of colors) {
      const key = color.toUpperCase();
      let record = usage.get(key);
      if (!record) {
        record = { color: key, projects: new Map() };
        usage.set(key, record);
      }
      const projectAssets = record.projects.get(project) || [];
      projectAssets.push(asset);
      record.projects.set(project, projectAssets);
    }
  }
  return { usage, entries };
}

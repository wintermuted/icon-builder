import type { LayerEdit, SvgData } from "../types.js";

export const assetSvgDataCache = new Map<string, Promise<SvgData>>();

export const assetLayerEdits = new Map<string, Map<number, LayerEdit>>();

export const assetCustomColors = new Map<string, string[]>();

export const assetViewBoxEdits = new Map<string, number[]>();

export const assetAccessibilityEdits = new Map<string, { title: string; description: string }>();

export const assetSourceSizeEdits = new Map<string, { width: number; height: number }>();

export const assetGroupEdits = new Map<string, Map<number, { opacity: number }>>();

class ModifiedAssets extends Set<string> {
  add(id: string) {
    super.add(id);
    window.dispatchEvent(new Event("canvas-dirty"));
    return this;
  }
}

export const assetModified = new ModifiedAssets();

export const assetLayerSelections = new Map<string, Set<number>>();

export const assetPendingGroupFocus = new Map<string, Set<number>>();

export const assetPendingElementSelection = new Map<string, number>();

export const assetCollapsedGroups = new Map<string, WeakSet<SVGGElement>>();

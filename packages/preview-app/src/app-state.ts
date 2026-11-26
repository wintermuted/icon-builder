import type { Asset, Project } from "./types.js";

interface AppState {
  diagramData: { id: string; title: string; code: string }[];
  assetData: Asset[];
  assetById: Map<string, Asset>;
  projectMetaByName: Map<string, Project>;
  activePrimaryLayerInteractionCleanup: (() => void) | null;
}

export const appState: AppState = {
  diagramData: [],
  assetData: [],
  assetById: new Map(),
  projectMetaByName: new Map(),
  activePrimaryLayerInteractionCleanup: null,
};

import type { Asset, Project } from "./types.js";

interface AppState {
  diagramData: { title: string; code: string }[];
  assetData: Asset[];
  assetById: Map<string, Asset>;
  projectMetaByName: Map<string, Project>;
  activeGroupingMode: string;
  projectSamplePrompts: string[];
  activeProjectPromptIndex: number;
  activePrimaryLayerInteractionCleanup: (() => void) | null;
}

export const appState: AppState = {
  diagramData: [],
  assetData: [],
  assetById: new Map(),
  projectMetaByName: new Map(),
  activeGroupingMode: "project",
  projectSamplePrompts: [],
  activeProjectPromptIndex: 0,
  activePrimaryLayerInteractionCleanup: null,
};

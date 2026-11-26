import { createRoot } from "react-dom/client";
import {
  createIcons,
  Square,
  Grid2x2,
  Circle,
  Minus,
  Spline,
  Pentagon,
  PenLine,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Layers,
  Pencil,
  Plus,
  CircleGauge,
  X,
} from "lucide";
import { PreviewApp } from "./ui/shell.js";
import { PreviewBoundary } from "@wm-asset-workflows/ui-components";
import { appState } from "./app-state.js";
import { loadJson } from "./app-shell.js";
import "@wintermuted/ui-theme/index.css";
import "@wm-asset-workflows/ui-components/styles.css";
import "../../../preview/styles.css";

// Only the SVG editor's imperative controls use Lucide's DOM adapter.
Object.assign(window, {
  lucide: {
    createIcons: () =>
      createIcons({
        icons: {
          Square,
          Grid2x2,
          Circle,
          Minus,
          Spline,
          Pentagon,
          PenLine,
          ChevronDown,
          ChevronUp,
          ChevronRight,
          Layers,
          Pencil,
          Plus,
          CircleGauge,
          X,
        },
      }),
  },
});

const container = document.getElementById("root");
if (!container) throw new Error("Preview root is missing");
const root = createRoot(container);
root.render(
  <main className="preview-content" role="status">
    Loading preview...
  </main>,
);

Promise.all([loadJson("../manifests/assets.json"), loadJson("./spec-index.json")])
  .then(([manifest, specs]) => {
    appState.assetData = manifest.assets ?? [];
    appState.assetById = new Map(appState.assetData.map((asset) => [asset.id, asset]));
    appState.projectMetaByName = new Map(
      (manifest.projects ?? [])
        .filter((project) => project?.name)
        .map((project) => [String(project.name).trim(), project]),
    );
    appState.diagramData = specs.diagrams ?? [];
    root.render(
      <PreviewBoundary>
        <PreviewApp />
      </PreviewBoundary>,
    );
  })
  .catch((error) => {
    console.error("Preview failed", error);
    root.render(
      <main className="preview-content">
        <section className="card">
          <div className="card-header">
            <h3>Preview failed</h3>
          </div>
          <div className="card-body">
            <p role="alert">{error instanceof Error ? error.message : String(error)}</p>
          </div>
        </section>
      </main>,
    );
  });

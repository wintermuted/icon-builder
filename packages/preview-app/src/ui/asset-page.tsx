import { useLayoutEffect, useState } from "react";
import { EditorPortals, EditorPresentation } from "../editor/presentation.js";
import { appState } from "../app-state.js";
import { renderAssetDetail } from "../views/asset-detail.js";
import {
  isCopilotCanvas,
  prepareCanvasAsset,
  releaseCanvasAsset,
  discardCanvasDraft,
} from "../copilot-canvas.js";
import { showToast } from "../app-shell.js";
import { AnalysisPanel, LayerPanel } from "./editor-panels.js";
import {
  ActionGroup,
  FormField,
  Icon,
  PageHeader,
  ResponsiveGrid,
  ToggleButton,
} from "@wm-asset-workflows/ui-components";

export function AssetPage({ assetId }: { assetId: string }) {
  const [presentation] = useState(() => new EditorPresentation());
  const [failure, setFailure] = useState("");
  useLayoutEffect(() => {
    let cancelled = false;
    if (isCopilotCanvas) {
      void prepareCanvasAsset(assetId)
        .then(() => {
          if (!cancelled) renderAssetDetail(assetId, presentation);
        })
        .catch((error) => {
          if (!cancelled) setFailure(error.message);
        });
    } else renderAssetDetail(assetId, presentation);
    return () => {
      cancelled = true;
      releaseCanvasAsset();
      appState.activePrimaryLayerInteractionCleanup?.();
      appState.activePrimaryLayerInteractionCleanup = null;
      presentation.dispose();
    };
  }, [assetId, presentation]);
  if (failure)
    return (
      <section role="alert">
        <p>{failure}</p>
        <a href="#logos">Back to projects</a>
      </section>
    );
  return (
    <section id="asset-detail" className="asset-detail-page">
      <EditorPortals presentation={presentation} />
      <PageHeader
        className="project-detail-header"
        titleRowClassName="project-detail-title-row"
        title="Asset Detail"
        titleId="asset-detail-title"
        leading={
          <a
            id="asset-project-link"
            href="#logos"
            className="project-title-action"
            aria-label="Back to all assets"
            title="Back to all assets"
          >
            <Icon name="ArrowLeft" />
          </a>
        }
        actions={
          <>
            {isCopilotCanvas && (
              <>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    const svg = document.querySelector("#asset-primary-svg svg");
                    if (svg)
                      void navigator.clipboard
                        .writeText(new XMLSerializer().serializeToString(svg))
                        .then(() => showToast("Copied current SVG."))
                        .catch((error) => showToast(error.message));
                  }}
                >
                  Copy SVG
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    void discardCanvasDraft().catch((error) => showToast(error.message));
                  }}
                >
                  Discard draft
                </button>
              </>
            )}
            <a
              id="asset-deep-link"
              className="project-deep-link"
              href="#"
              title="Asset deep link"
              aria-label="Asset deep link"
            >
              <Icon name="Link" />
            </a>
            <button
              id="asset-save-button"
              type="button"
              className="btn btn-sm btn-primary"
              disabled
              title="Save asset changes"
            >
              <Icon name="Save" />
              Save
            </button>
          </>
        }
      />
      <div id="asset-detail-overview" className="asset-detail-overview">
        <AnalysisPanel />
        <div id="asset-primary-preview" className="asset-primary-preview">
          <ActionGroup className="asset-preview-toolbar" justify="center">
            <label htmlFor="asset-preview-size-select">Canvas size</label>
            <select
              id="asset-preview-size-select"
              className="wm-input"
              aria-label="Canvas preview size"
            />
            <ToggleButton id="asset-preview-size-list-toggle" pressed={false} icon="Grid2x2">
              Compare sizes
            </ToggleButton>
            <ToggleButton id="asset-grid-visibility-toggle" pressed={false}>
              Show grid
            </ToggleButton>
            <ToggleButton id="asset-grid-snap-toggle" pressed={false}>
              Snap to grid
            </ToggleButton>
            <FormField
              className="asset-grid-size-control"
              controlId="asset-grid-size-input"
              label="Grid spacing"
              inline
            >
              <input
                id="asset-grid-size-input"
                type="number"
                min="1"
                step="1"
                defaultValue="8"
                aria-label="Grid spacing in SVG units"
              />
            </FormField>
          </ActionGroup>
          <div id="asset-primary-canvas" className="asset-primary-canvas">
            <div
              id="asset-primary-svg"
              className="asset-primary-svg"
              role="img"
              aria-label="Asset preview"
            />
            <div id="asset-primary-guides" className="asset-primary-guides" hidden />
            <div
              id="asset-primary-tooltip"
              className="asset-primary-tooltip"
              role="status"
              hidden
            />
            <div id="asset-primary-handles" className="asset-primary-handles" hidden />
            <div id="asset-primary-points" className="asset-primary-points" hidden />
            <div id="asset-primary-grid" className="asset-primary-grid" hidden />
            <div
              id="asset-primary-shape-mode"
              className="asset-primary-shape-mode"
              role="status"
              hidden
            />
          </div>
          <ResponsiveGrid
            id="asset-size-grid"
            className="asset-size-grid"
            minItemWidth="108px"
            gap="0.65rem"
            mode="auto-fill"
            hidden
            aria-label="All preview sizes"
          />
        </div>
        <LayerPanel />
      </div>
    </section>
  );
}

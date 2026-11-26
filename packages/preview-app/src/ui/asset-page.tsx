import { useLayoutEffect } from "react";
import { appState } from "../app-state.js";
import { renderAssetDetail } from "../views/asset-detail.js";
import { AnalysisPanel, LayerPanel } from "./editor-panels.js";
import { Icon } from "@wm-asset-workflows/ui-components";

export function AssetPage({ assetId }: { assetId: string }) {
  useLayoutEffect(() => {
    renderAssetDetail(assetId);
    return () => {
      appState.activePrimaryLayerInteractionCleanup?.();
      appState.activePrimaryLayerInteractionCleanup = null;
    };
  }, [assetId]);
  return (
    <section id="asset-detail" className="asset-detail-page">
      <header className="project-detail-header">
        <div className="project-detail-title-row">
          <a
            id="asset-project-link"
            href="#logos"
            className="project-title-action"
            aria-label="Back to all assets"
            title="Back to all assets"
          >
            <Icon name="ArrowLeft" />
          </a>
          <h3 id="asset-detail-title">Asset Detail</h3>
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
        </div>
      </header>
      <div id="asset-detail-overview" className="asset-detail-overview">
        <AnalysisPanel />
        <div id="asset-primary-preview" className="asset-primary-preview">
          <div className="asset-preview-toolbar">
            <label htmlFor="asset-preview-size-select">Canvas size</label>
            <select
              id="asset-preview-size-select"
              className="wm-input"
              aria-label="Canvas preview size"
            />
            <button
              id="asset-preview-size-list-toggle"
              type="button"
              className="btn btn-sm"
              aria-pressed="false"
            >
              <Icon name="Grid2x2" />
              Compare sizes
            </button>
            <button
              id="asset-grid-visibility-toggle"
              type="button"
              className="btn btn-sm"
              aria-pressed="false"
            >
              Show grid
            </button>
            <button
              id="asset-grid-snap-toggle"
              type="button"
              className="btn btn-sm"
              aria-pressed="false"
            >
              Snap to grid
            </button>
            <label className="asset-grid-size-control">
              <span>Grid spacing</span>
              <input
                id="asset-grid-size-input"
                type="number"
                min="1"
                step="1"
                defaultValue="8"
                aria-label="Grid spacing in SVG units"
              />
            </label>
          </div>
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
          <div
            id="asset-size-grid"
            className="asset-size-grid"
            hidden
            aria-label="All preview sizes"
          />
        </div>
        <LayerPanel />
      </div>
    </section>
  );
}

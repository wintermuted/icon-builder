import { buildProjectAssets, projectRouteHref, primaryProjectAsset } from "../project/model.js";
import { appState } from "../app-state.js";
import {
  EmptyState,
  Icon,
  IconActionButton,
  PreviewCard,
  PreviewSurface,
  ResponsiveGrid,
} from "@wm-asset-workflows/ui-components";
import { AssetPalette } from "./palette.js";
import { showToast } from "../app-shell.js";
import type { Asset } from "../types.js";

export function Collection({ onNewProject }: { onNewProject(): void }) {
  return (
    <section id="logos">
      <div className="logos-section-header">
        <h2 className="logos-section-title">Projects</h2>
        <button
          id="new-project-btn"
          type="button"
          className="btn btn-sm btn-primary"
          onClick={onNewProject}
        >
          <Icon name="Plus" />
          New Project
        </button>
      </div>
      <div id="logo-groups" className="logo-groups logo-groups--project" aria-label="Project list">
        {Array.from(buildProjectAssets(appState.assetData), ([name, assets]) => {
          const asset = primaryProjectAsset(name, assets);
          return (
            <section key={name} className="logo-group">
              <div className="logo-group-header">
                <h4>
                  <a className="project-title-link" href={projectRouteHref(name)}>
                    {name}
                  </a>
                </h4>
                <p>
                  {assets.length} item{assets.length === 1 ? "" : "s"}
                </p>
              </div>
              {asset ? (
                <ResponsiveGrid className="asset-grid">
                  <PreviewCard
                    preview={
                      <PreviewSurface className="logo-frame">
                        <a
                          className="project-icon-link"
                          href={projectRouteHref(name)}
                          aria-label={`Open project page for ${name}`}
                        >
                          <img src={`../${asset.source}`} alt={asset.label} />
                        </a>
                      </PreviewSurface>
                    }
                  />
                </ResponsiveGrid>
              ) : (
                <EmptyState className="project-empty-state">
                  <a href={projectRouteHref(name)} className="project-empty-cta">
                    <Icon name="ImagePlus" />
                    <span>Add first asset</span>
                  </a>
                </EmptyState>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function AssetCard({ asset }: { asset: Asset }) {
  const href = `#asset/${encodeURIComponent(asset.id)}`;
  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.hash = href;
    try {
      await navigator.clipboard.writeText(url.href);
      showToast("Asset link copied.");
    } catch {
      showToast("Unable to copy asset link.");
    }
  };
  return (
    <PreviewCard
      preview={
        <a className="asset-preview-link" href={href}>
          <PreviewSurface className="logo-frame">
            <img src={`../${asset.source}`} alt={asset.label} />
          </PreviewSurface>
        </a>
      }
      title={asset.label}
      titleHref={href}
      footer={
        <div className="asset-tile-footer">
          <p>{asset.id}</p>
          <IconActionButton
            className="asset-copy-link btn btn-sm"
            icon="Copy"
            label={`Copy ${asset.label} deep link`}
            title="Copy asset deep link"
            onClick={copyLink}
          />
        </div>
      }
    >
      <div className="asset-colors" aria-label={`Colors used in ${asset.label}`}>
        <span className="asset-colors-label">Colors</span>
        <AssetPalette asset={asset} />
      </div>
    </PreviewCard>
  );
}

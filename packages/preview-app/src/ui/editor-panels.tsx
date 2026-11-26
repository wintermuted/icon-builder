import { useState, type ReactNode } from "react";
import { Icon } from "./icon.js";

export function EditorSidebar({
  side,
  label,
  children,
}: {
  side: "left" | "right";
  label: string;
  children: ReactNode;
}) {
  const key = `wm-assets-${side}-sidebar-collapsed`;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(key) === "true");
  const contentId = `asset-detail-${side}-sidebar-content`;
  return (
    <aside
      id={`asset-detail-${side}-sidebar`}
      className={`asset-detail-sidebar asset-detail-sidebar--${side}${collapsed ? " is-collapsed" : ""}`}
      aria-label={label}
    >
      <div className="asset-detail-sidebar-header">
        <span>{label}</span>
        <button
          id={`asset-detail-${side}-sidebar-toggle`}
          className="asset-detail-sidebar-toggle"
          type="button"
          aria-controls={contentId}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${label.toLowerCase()}`}
          title={`${collapsed ? "Expand" : "Collapse"} ${label.toLowerCase()}`}
          onClick={() => {
            localStorage.setItem(key, String(!collapsed));
            setCollapsed(!collapsed);
          }}
        >
          <Icon
            name={
              side === "left"
                ? collapsed
                  ? "PanelLeftOpen"
                  : "PanelLeftClose"
                : collapsed
                  ? "PanelRightOpen"
                  : "PanelRightClose"
            }
          />
        </button>
      </div>
      <div id={contentId} className="asset-detail-sidebar-content" inert={collapsed}>
        {children}
      </div>
    </aside>
  );
}

export function AnalysisPanel() {
  return (
    <EditorSidebar side="left" label="Asset analysis">
      <details
        id="asset-detail-colors-section"
        className="asset-detail-colors asset-detail-disclosure project-collapsible-card"
        open
      >
        <summary>
          <h4 id="asset-detail-colors-heading">Colors</h4>
          <Icon name="ChevronDown" />
        </summary>
        <div className="asset-detail-disclosure-body" aria-labelledby="asset-detail-colors-heading">
          <div className="asset-color-group">
            <span className="asset-color-group-label">Asset palette</span>
            <div className="asset-palette-row">
              <div id="asset-detail-colors" className="asset-colors-list" aria-live="polite" />
              <div id="asset-custom-colors" className="asset-colors-list" />
              <form id="asset-custom-color-form" className="asset-custom-color-form">
                <input
                  id="asset-custom-color-input"
                  className="asset-custom-color-picker"
                  type="color"
                  defaultValue="#257375"
                  aria-label="Choose asset palette color"
                />
                <button
                  type="button"
                  id="asset-custom-color-add"
                  className="asset-color-add-button"
                  aria-label="Add asset palette color"
                  title="Add asset palette color"
                >
                  <Icon name="Plus" />
                </button>
              </form>
            </div>
          </div>
          <div className="asset-color-group">
            <span className="asset-color-group-label">Project palette</span>
            <div id="asset-project-colors" className="asset-colors-list" />
          </div>
          <p
            id="asset-color-highlight-status"
            className="asset-color-highlight-status"
            aria-live="polite"
          />
        </div>
      </details>
      <details
        className="asset-detail-diagnostics asset-detail-disclosure project-collapsible-card"
        open
      >
        <summary>
          <h4 id="asset-detail-diagnostics-heading">SVG Diagnostics</h4>
          <Icon name="ChevronDown" />
        </summary>
        <div
          className="asset-detail-disclosure-body"
          aria-labelledby="asset-detail-diagnostics-heading"
        >
          <div className="asset-viewbox-summary">
            <span>ViewBox</span>
            <code id="asset-viewbox-value">Loading...</code>
            <button
              id="asset-viewbox-edit"
              type="button"
              className="asset-viewbox-edit"
              aria-label="Edit ViewBox"
              title="Edit ViewBox"
            >
              <Icon name="Pencil" />
            </button>
          </div>
          <div id="asset-viewbox-editor" className="asset-viewbox-editor" hidden>
            <form id="asset-viewbox-form">
              <strong>Edit ViewBox</strong>
              {(["x", "y", "width", "height"] as const).map((name) => (
                <label key={name}>
                  {name === "width" ? "W" : name === "height" ? "H" : name.toUpperCase()}
                  <input
                    id={`asset-viewbox-${name}`}
                    type="number"
                    step="0.01"
                    min={name === "width" || name === "height" ? "0.01" : undefined}
                    aria-label={`ViewBox ${name === "x" || name === "y" ? name.toUpperCase() : name}`}
                  />
                </label>
              ))}
              <div className="asset-viewbox-actions">
                <button type="button" id="asset-viewbox-cancel">
                  Cancel
                </button>
                <button type="submit">Apply</button>
              </div>
            </form>
          </div>
          <dl id="asset-detail-diagnostics" />
        </div>
      </details>
    </EditorSidebar>
  );
}

export function LayerPanel() {
  return (
    <EditorSidebar side="right" label="Element editor">
      <details
        id="asset-detail-layers-section"
        className="asset-detail-layers asset-detail-disclosure project-collapsible-card"
        open
      >
        <summary>
          <h4 id="asset-detail-layers-heading">Elements</h4>
          <span>Top to bottom</span>
          <Icon name="ChevronDown" />
        </summary>
        <div className="asset-detail-disclosure-body" aria-labelledby="asset-detail-layers-heading">
          <div id="asset-layer-actions" className="asset-layer-actions" hidden />
          <ol id="asset-detail-layers" reversed aria-live="polite" />
          <div id="asset-layer-editor-panel" className="asset-layer-editor-panel" hidden />
        </div>
      </details>
    </EditorSidebar>
  );
}

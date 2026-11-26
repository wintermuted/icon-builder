import {
  ActionGroup,
  EditorSidebar,
  EditableValue,
  FormField,
  Icon,
  IconActionButton,
  StatusMessage,
} from "@wm-asset-workflows/ui-components";

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
                <IconActionButton
                  id="asset-custom-color-add"
                  className="asset-color-add-button"
                  icon="Plus"
                  label="Add asset palette color"
                />
              </form>
            </div>
          </div>
          <div className="asset-color-group">
            <span className="asset-color-group-label">Project palette</span>
            <div id="asset-project-colors" className="asset-colors-list" />
          </div>
          <StatusMessage
            id="asset-color-highlight-status"
            className="asset-color-highlight-status"
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
          <EditableValue
            className="asset-viewbox-summary"
            label="ViewBox"
            value="Loading..."
            valueProps={{ id: "asset-viewbox-value" }}
            editLabel="Edit ViewBox"
            editButtonProps={{ id: "asset-viewbox-edit", className: "asset-viewbox-edit" }}
          />
          <div id="asset-viewbox-editor" className="asset-viewbox-editor" hidden>
            <form id="asset-viewbox-form">
              <strong>Edit ViewBox</strong>
              {(["x", "y", "width", "height"] as const).map((name) => (
                <FormField
                  key={name}
                  controlId={`asset-viewbox-${name}`}
                  className="asset-viewbox-field"
                  label={name === "width" ? "W" : name === "height" ? "H" : name.toUpperCase()}
                  inline
                >
                  <input
                    id={`asset-viewbox-${name}`}
                    type="number"
                    step="0.01"
                    min={name === "width" || name === "height" ? "0.01" : undefined}
                    aria-label={`ViewBox ${name === "x" || name === "y" ? name.toUpperCase() : name}`}
                  />
                </FormField>
              ))}
              <ActionGroup
                className="asset-viewbox-actions"
                gap="0.4rem"
                align="stretch"
                justify="flex-end"
                wrap={false}
              >
                <button type="button" id="asset-viewbox-cancel">
                  Cancel
                </button>
                <button type="submit">Apply</button>
              </ActionGroup>
            </form>
          </div>
          <div id="asset-detail-diagnostics" />
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

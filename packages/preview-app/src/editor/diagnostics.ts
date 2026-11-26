import { parseSvgViewBox } from "../svg/geometry.js";
import { assetSourceSizeEdits, assetAccessibilityEdits } from "../svg/editor-state.js";
import { loadAssetSvgData } from "../svg/analysis.js";
import { createElement } from "react";
import { EditableValue, PropertyList } from "@wm-asset-workflows/ui-components";
import type { EditorPresentation } from "./presentation.js";

export function renderAssetSourceSizeEditor(
  body,
  root,
  asset,
  data,
  onChange,
  presentation: EditorPresentation,
) {
  const sourceViewBox = parseSvgViewBox(data.viewBox);
  const sourceSize = assetSourceSizeEdits.get(asset.id) || {
    width: Number.isFinite(Number(data.width)) ? Number(data.width) : sourceViewBox?.[2],
    height: Number.isFinite(Number(data.height)) ? Number(data.height) : sourceViewBox?.[3],
  };
  assetSourceSizeEdits.set(asset.id, sourceSize);
  const summary = document.createElement("div");
  summary.style.display = "contents";
  summary.dataset.sourceSizeSummary = "";
  const formattedValue =
    Number.isFinite(sourceSize.width) && Number.isFinite(sourceSize.height)
      ? `${sourceSize.width} × ${sourceSize.height}`
      : "Not defined";

  const editor = document.createElement("div");
  editor.className = "asset-accessibility-editor";
  editor.dataset.sourceSizeEditor = "";
  editor.hidden = true;
  const form = document.createElement("form");
  const heading = document.createElement("strong");
  heading.textContent = "Edit source size";
  const widthInput = document.createElement("input");
  const heightInput = document.createElement("input");
  for (const [input, name] of [
    [widthInput, "Source width"],
    [heightInput, "Source height"],
  ]) {
    input.type = "number";
    input.min = "0.01";
    input.step = "0.01";
    input.required = true;
    input.setAttribute("aria-label", name);
  }
  const widthLabel = document.createElement("label");
  widthLabel.textContent = "Width";
  widthLabel.appendChild(widthInput);
  const heightLabel = document.createElement("label");
  heightLabel.textContent = "Height";
  heightLabel.appendChild(heightInput);
  const actions = document.createElement("div");
  actions.className = "asset-accessibility-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  const apply = document.createElement("button");
  apply.type = "submit";
  apply.textContent = "Apply";
  actions.append(cancel, apply);
  form.append(heading, widthLabel, heightLabel, actions);
  editor.appendChild(form);
  presentation.mount(
    summary,
    createElement(EditableValue, {
      label: "Source size",
      value: formattedValue,
      editLabel: "Edit source size",
      className: "asset-accessibility-summary",
      editButtonProps: { className: "asset-accessibility-edit" },
      onEdit: () => {
        widthInput.value = Number.isFinite(sourceSize.width) ? String(sourceSize.width) : "";
        heightInput.value = Number.isFinite(sourceSize.height) ? String(sourceSize.height) : "";
        editor.hidden = false;
        widthInput.focus();
      },
    }),
  );
  const value = summary.querySelector("code");
  if (!value) throw new Error("Source size summary did not mount.");
  body.insertBefore(summary, root);
  body.insertBefore(editor, root);
  cancel.addEventListener("click", () => {
    editor.hidden = true;
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const next = { width: Number(widthInput.value), height: Number(heightInput.value) };
    assetSourceSizeEdits.set(asset.id, next);
    value.textContent = `${next.width} × ${next.height}`;
    onChange?.(next);
    editor.hidden = true;
  });
}

export function renderAssetDiagnostics(
  root,
  asset,
  onAccessibilityChange,
  onSourceSizeChange,
  presentation: EditorPresentation,
) {
  const revision = presentation.revision;
  root.textContent = "Loading...";
  root.dataset.assetId = asset.id;

  loadAssetSvgData(asset.source)
    .then((data) => {
      if (
        !root.isConnected ||
        root.dataset.assetId !== asset.id ||
        revision !== presentation.revision
      )
        return;
      root.textContent = "";
      const accessibility = assetAccessibilityEdits.get(asset.id) || {
        title: data.accessibleName === "Not defined" ? "" : data.accessibleName,
        description: data.description === "Not defined" ? "" : data.description,
      };
      assetAccessibilityEdits.set(asset.id, accessibility);
      const body = root.parentElement;
      body?.querySelectorAll("[data-accessibility-editor]").forEach((element) => element.remove());
      body
        ?.querySelectorAll("[data-source-size-editor], [data-source-size-summary]")
        .forEach((element) => element.remove());
      if (body)
        renderAssetSourceSizeEditor(body, root, asset, data, onSourceSizeChange, presentation);
      const summary = document.createElement("div");
      summary.style.display = "contents";
      summary.dataset.accessibilityEditor = "";

      const editor = document.createElement("div");
      editor.className = "asset-accessibility-editor";
      editor.dataset.accessibilityEditor = "";
      editor.hidden = true;
      const form = document.createElement("form");
      const heading = document.createElement("strong");
      heading.textContent = "Edit accessibility";
      const titleLabel = document.createElement("label");
      titleLabel.textContent = "Accessible title";
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.setAttribute("aria-label", "Accessible title");
      titleLabel.appendChild(titleInput);
      const descriptionLabel = document.createElement("label");
      descriptionLabel.textContent = "Description";
      const descriptionInput = document.createElement("textarea");
      descriptionInput.rows = 2;
      descriptionInput.setAttribute("aria-label", "Accessible description");
      descriptionLabel.appendChild(descriptionInput);
      const actions = document.createElement("div");
      actions.className = "asset-accessibility-actions";
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";
      const applyButton = document.createElement("button");
      applyButton.type = "submit";
      applyButton.textContent = "Apply";
      actions.append(cancelButton, applyButton);
      form.append(heading, titleLabel, descriptionLabel, actions);
      editor.appendChild(form);
      presentation.mount(
        summary,
        createElement(EditableValue, {
          label: "Accessibility",
          value: accessibility.title || "No title or description",
          editLabel: "Edit accessible title and description",
          className: "asset-accessibility-summary",
          editButtonProps: { className: "asset-accessibility-edit" },
          onEdit: () => {
            titleInput.value = accessibility.title;
            descriptionInput.value = accessibility.description;
            editor.hidden = false;
            titleInput.focus();
          },
        }),
      );
      const summaryValue = summary.querySelector("code");
      if (!summaryValue) throw new Error("Accessibility summary did not mount.");
      body?.insertBefore(summary, root);
      body?.insertBefore(editor, root);

      const closeEditor = () => {
        editor.hidden = true;
      };
      cancelButton.addEventListener("click", closeEditor);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const next = { title: titleInput.value.trim(), description: descriptionInput.value.trim() };
        assetAccessibilityEdits.set(asset.id, next);
        summaryValue.textContent = next.title || "No title or description";
        onAccessibilityChange?.(next);
        closeEditor();
      });
      const diagnostics = [
        ["Elements", `${data.paintLayerCount} primitives`],
        ["Element order", "DOM order, bottom → top"],
        ["Topmost element", data.topmostLayer],
        [
          "Paths",
          `${data.pathCount} (${data.closedPathCount} closed, ${data.pathCount - data.closedPathCount} open)`,
        ],
        ["Path subpaths", String(data.pathSubpathCount)],
        ["Path commands", String(data.pathCommandCount)],
        [
          "Groups",
          data.groupCount ? `${data.groupCount} (max depth ${data.maxGroupDepth})` : "None",
        ],
        ["Effects", data.effects],
        [
          "File size",
          data.byteSize < 1024 ? `${data.byteSize} B` : `${(data.byteSize / 1024).toFixed(1)} KB`,
        ],
      ];
      presentation.mount(
        root,
        createElement(PropertyList, {
          items: diagnostics.map(([label, value]) => ({ key: label, label, value })),
          gap: "0.45rem 0.9rem",
        }),
      );
      if (typeof lucide !== "undefined") lucide.createIcons();
    })
    .catch((error) => {
      console.error("Failed to render asset diagnostics", error);
      if (
        root.isConnected &&
        root.dataset.assetId === asset.id &&
        revision === presentation.revision
      )
        root.textContent = "Diagnostics unavailable";
    });
}

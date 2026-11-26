import { assetLayerSelections, assetCollapsedGroups } from "../svg/editor-state.js";
import { NEW_ELEMENT_SHAPES } from "../svg/geometry.js";
import { createElement } from "react";
import { SplitButton, type IconName } from "@wm-asset-workflows/ui-components";
import type { EditorPresentation } from "./presentation.js";
import type { SvgData } from "../types.js";

const shapeIcons: Record<string, IconName> = {
  rect: "Square",
  circle: "Circle",
  ellipse: "Circle",
  line: "Minus",
  polyline: "Spline",
  polygon: "Pentagon",
  path: "PenLine",
};

export function assetLayerSelection(assetId) {
  if (!assetLayerSelections.has(assetId)) assetLayerSelections.set(assetId, new Set());
  return assetLayerSelections.get(assetId);
}

export function collapsedGroupsForAsset(assetId) {
  if (!assetCollapsedGroups.has(assetId)) assetCollapsedGroups.set(assetId, new WeakSet());
  return assetCollapsedGroups.get(assetId);
}

export function renderAssetLayerActions(
  actionsBar: HTMLElement,
  data: Pick<SvgData, "paintLayerCount">,
  onCombine: () => void,
  onClear: () => void,
  onAdd: (shape: string) => void,
  presentation: EditorPresentation,
) {
  actionsBar.replaceChildren();
  actionsBar.hidden = false;

  let selectedShape = NEW_ELEMENT_SHAPES[0].value;
  const getShape = () =>
    NEW_ELEMENT_SHAPES.find(({ value }) => value === selectedShape) || NEW_ELEMENT_SHAPES[0];

  presentation.mount(
    actionsBar,
    createElement(SplitButton, {
      options: NEW_ELEMENT_SHAPES.map(({ value, label }) => ({
        value,
        label,
        icon: shapeIcons[value],
      })),
      actionLabel: "Add element",
      menuLabel: "Change element shape",
      className: "asset-layer-add-group",
      buttonProps: {
        className: "asset-layer-add-button",
        title: "Add a new rectangle at the topmost layer",
      },
      menuClassName: "asset-layer-shape-menu",
      optionsClassName: "asset-layer-shape-options",
      optionClassName: "asset-layer-shape-option",
      onAction: onAdd,
      onValueChange: (value) => {
        selectedShape = value;
        const button = actionsBar.querySelector<HTMLButtonElement>(".asset-layer-add-button");
        if (!button) throw new Error("Shape selection button is unavailable.");
        button.dataset.shape = value;
        button.title = `Add a new ${getShape().label.toLowerCase()} at the topmost layer`;
      },
    }),
  );
  const addButton = actionsBar.querySelector<HTMLButtonElement>(".asset-layer-add-button");
  if (!addButton) throw new Error("SplitButton did not mount.");
  addButton.dataset.shape = selectedShape;
  actionsBar.querySelectorAll<HTMLButtonElement>(".asset-layer-shape-option").forEach((button) => {
    button.dataset.shape = button.dataset.value;
  });

  const combineGroup = document.createElement("div");
  combineGroup.className = "asset-layer-combine-group";
  combineGroup.hidden = data.paintLayerCount < 2;

  const status = document.createElement("p");
  status.className = "asset-layer-actions-status";
  status.setAttribute("aria-live", "polite");

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "asset-layer-actions-clear";
  clearButton.textContent = "Clear";
  clearButton.title = "Clear element selection";
  clearButton.hidden = true;
  clearButton.addEventListener("click", onClear);

  const combineButton = document.createElement("button");
  combineButton.type = "button";
  combineButton.className = "asset-layer-combine-button";
  combineButton.disabled = true;
  combineButton.title = "Wrap the selected elements in a group";
  combineButton.innerHTML =
    '<i data-lucide="layers" aria-hidden="true"></i><span>Combine elements</span>';
  combineButton.addEventListener("click", onCombine);

  combineGroup.append(status, clearButton, combineButton);
  actionsBar.appendChild(combineGroup);
  return { status, combineButton, clearButton, getShape };
}

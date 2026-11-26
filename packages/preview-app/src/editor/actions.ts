import { assetLayerSelections, assetCollapsedGroups } from "../svg/editor-state.js";
import { NEW_ELEMENT_SHAPES } from "../svg/geometry.js";

export function assetLayerSelection(assetId) {
  if (!assetLayerSelections.has(assetId)) assetLayerSelections.set(assetId, new Set());
  return assetLayerSelections.get(assetId);
}

export function collapsedGroupsForAsset(assetId) {
  if (!assetCollapsedGroups.has(assetId)) assetCollapsedGroups.set(assetId, new WeakSet());
  return assetCollapsedGroups.get(assetId);
}

export function renderAssetLayerActions(actionsBar, data, onCombine, onClear, onAdd) {
  actionsBar.replaceChildren();
  actionsBar.hidden = false;

  const addGroup = document.createElement("div");
  addGroup.className = "asset-layer-add-group";

  let selectedShape = NEW_ELEMENT_SHAPES[0].value;
  const getShape = () =>
    NEW_ELEMENT_SHAPES.find(({ value }) => value === selectedShape) || NEW_ELEMENT_SHAPES[0];

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "asset-layer-add-button";
  addButton.dataset.shape = selectedShape;
  addButton.title = "Add a new rectangle at the topmost layer";
  addButton.innerHTML = '<i data-lucide="square" aria-hidden="true"></i><span>Add element</span>';
  addButton.addEventListener("click", () => onAdd(selectedShape));

  const shapeMenu = document.createElement("details");
  shapeMenu.className = "asset-layer-shape-menu";
  const shapeMenuToggle = document.createElement("summary");
  shapeMenuToggle.setAttribute("aria-label", "Change element shape");
  shapeMenuToggle.title = "Change element shape";
  shapeMenuToggle.innerHTML = '<i data-lucide="chevron-down" aria-hidden="true"></i>';
  const shapeMenuList = document.createElement("div");
  shapeMenuList.className = "asset-layer-shape-options";
  for (const { value, label, icon } of NEW_ELEMENT_SHAPES) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "asset-layer-shape-option";
    option.dataset.shape = value;
    option.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i><span>${label}</span>`;
    option.addEventListener("click", () => {
      selectedShape = value;
      const shape = getShape();
      addButton.dataset.shape = selectedShape;
      addButton.title = `Add a new ${shape.label.toLowerCase()} at the topmost layer`;
      const icon = document.createElement("i");
      icon.dataset.lucide = shape.icon;
      icon.setAttribute("aria-hidden", "true");
      addButton.querySelector("[data-lucide], svg")?.replaceWith(icon);
      if (typeof lucide !== "undefined") lucide.createIcons();
      shapeMenu.open = false;
    });
    shapeMenuList.appendChild(option);
  }
  shapeMenu.append(shapeMenuToggle, shapeMenuList);
  addGroup.append(addButton, shapeMenu);

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
  actionsBar.append(addGroup, combineGroup);
  return { status, combineButton, clearButton, getShape };
}

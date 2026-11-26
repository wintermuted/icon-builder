import { reorderAssetLayer } from "../svg/mutations.js";
import { createLayerPaintControls } from "./paint-controls.js";
import { normalizeSvgColor, resolveSvgPaint, enumerateElementAttributes } from "../svg/analysis.js";
import { createSteppedNumberField, createGeometryField } from "./fields.js";
import { updateAssetLayerEdits } from "../svg/apply-edits.js";
import { assetLayerEdits } from "../svg/editor-state.js";
import { SVG_ELEMENT_GEOMETRY_ATTRIBUTES, GEOMETRY_ATTRIBUTES } from "../svg/geometry.js";
import type { LayerBindings } from "../controller-types.js";

export function createLayerRow(
  context: Pick<
    LayerBindings,
    | "onHighlight"
    | "hoveredLayerNumber"
    | "syncHighlight"
    | "selectLayer"
    | "focusedLayerNumber"
    | "selection"
    | "syncSelection"
    | "data"
    | "asset"
    | "layerItems"
    | "layerEdits"
    | "onEdit"
    | "geometryInputs"
    | "root"
    | "editorPanel"
    | "layerCheckboxes"
    | "layerEditButtons"
    | "layerButtons"
    | "onRefresh"
  >,
) {
  function renderElementRow(layer) {
    const item = document.createElement("li");
    item.value = layer.number;
    let toggleSelection;
    if (context.onHighlight) {
      item.addEventListener("mouseenter", () => {
        context.hoveredLayerNumber = layer.number;
        context.syncHighlight();
      });
      item.addEventListener("mouseleave", () => {
        if (context.hoveredLayerNumber === layer.number) context.hoveredLayerNumber = null;
        context.syncHighlight();
      });
      toggleSelection = (event) => context.selectLayer(layer.number, { additive: event?.shiftKey });
      item.addEventListener("click", toggleSelection);
    }
    const number = document.createElement(context.onHighlight ? "button" : "span");
    number.className = "asset-layer-number";
    number.textContent = String(layer.number);
    if (context.onHighlight) {
      number.type = "button";
      number.setAttribute("aria-label", `Select element ${layer.number}`);
      number.setAttribute("aria-pressed", "false");
      number.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSelection();
      });
      number.addEventListener("focus", () => {
        context.focusedLayerNumber = layer.number;
        context.syncHighlight();
      });
      number.addEventListener("blur", () => {
        if (context.focusedLayerNumber === layer.number) context.focusedLayerNumber = null;
        context.syncHighlight();
      });
    }
    const selectLabel = document.createElement("label");
    selectLabel.className = "asset-layer-select";
    const selectCheckbox = document.createElement("input");
    selectCheckbox.type = "checkbox";
    selectCheckbox.className = "asset-layer-select-input";
    selectCheckbox.checked = context.selection.has(layer.number);
    selectCheckbox.setAttribute("aria-label", `Select element ${layer.number} for combining`);
    selectLabel.title = `Select element ${layer.number} for combining`;
    selectLabel.addEventListener("click", (event) => event.stopPropagation());
    selectCheckbox.addEventListener("click", (event) => event.stopPropagation());
    selectCheckbox.addEventListener("change", () => {
      if (selectCheckbox.checked) context.selection.add(layer.number);
      else context.selection.delete(layer.number);
      context.syncSelection();
    });
    // Keep row drag-and-drop from hijacking checkbox interaction.
    const restoreDraggable = () => {
      item.draggable = true;
    };
    selectLabel.addEventListener("pointerdown", () => {
      item.draggable = false;
    });
    selectLabel.addEventListener("pointerup", restoreDraggable);
    selectLabel.addEventListener("pointercancel", restoreDraggable);
    item.addEventListener("mouseleave", restoreDraggable);
    selectLabel.appendChild(selectCheckbox);

    const identity = document.createElement("div");
    identity.className = "asset-layer-identity";
    const elementName = document.createElement("code");
    elementName.textContent = layer.element;
    identity.appendChild(elementName);
    if (layer.id) {
      const id = document.createElement("code");
      id.textContent = `#${layer.id}`;
      identity.appendChild(id);
    }

    const reorder = document.createElement("span");
    reorder.className = "asset-layer-reorder";
    const moveUpButton = document.createElement("button");
    moveUpButton.type = "button";
    moveUpButton.className = "asset-layer-reorder-button";
    moveUpButton.setAttribute("aria-label", `Move element ${layer.number} up`);
    moveUpButton.innerHTML = '<i data-lucide="chevron-up" aria-hidden="true"></i>';
    moveUpButton.disabled = layer.number >= context.data.paintLayerCount;
    moveUpButton.addEventListener("click", (event) => {
      event.stopPropagation();
      reorderAssetLayer(context.asset, layer.number, layer.number + 1, () => context.onRefresh());
    });
    const moveDownButton = document.createElement("button");
    moveDownButton.type = "button";
    moveDownButton.className = "asset-layer-reorder-button";
    moveDownButton.setAttribute("aria-label", `Move element ${layer.number} down`);
    moveDownButton.innerHTML = '<i data-lucide="chevron-down" aria-hidden="true"></i>';
    moveDownButton.disabled = layer.number <= 1;
    moveDownButton.addEventListener("click", (event) => {
      event.stopPropagation();
      reorderAssetLayer(context.asset, layer.number, layer.number - 1, () => context.onRefresh());
    });
    reorder.append(moveUpButton, moveDownButton);

    item.draggable = true;
    item.classList.add("asset-layer-draggable");
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", String(layer.number));
      event.dataTransfer.effectAllowed = "move";
      item.classList.add("is-dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      for (const otherItem of context.layerItems.values())
        otherItem.classList.remove("is-drag-over");
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      item.classList.add("is-drag-over");
    });
    item.addEventListener("dragleave", () => {
      item.classList.remove("is-drag-over");
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      item.classList.remove("is-drag-over");
      const sourceNumber = Number(event.dataTransfer.getData("text/plain"));
      if (!Number.isFinite(sourceNumber) || sourceNumber === layer.number) return;
      reorderAssetLayer(context.asset, sourceNumber, layer.number, () => context.onRefresh());
    });

    const layerPaintControlsController = createLayerPaintControls({
      layerEdits: context.layerEdits,
      layer,
      asset: context.asset,
      onEdit: context.onEdit,
    });
    layerPaintControlsController.opacityValue.type = "button";
    layerPaintControlsController.opacityValue.className = "asset-layer-opacity-value";
    layerPaintControlsController.opacityValue.setAttribute(
      "aria-label",
      `Edit element ${layer.number} opacity`,
    );
    layerPaintControlsController.opacityValue.setAttribute(
      "aria-controls",
      layerPaintControlsController.opacityEditor.id,
    );
    layerPaintControlsController.opacityValue.setAttribute("aria-expanded", "false");
    layerPaintControlsController.opacityValue.title = "Edit opacity";
    layerPaintControlsController.opacityValue.innerHTML = `<i data-lucide="circle-gauge" aria-hidden="true"></i><span>${layerPaintControlsController.opacityInput.value}</span>`;
    layerPaintControlsController.opacityValue.addEventListener("click", (event) => {
      event.stopPropagation();
      layerPaintControlsController.positionPopover(
        layerPaintControlsController.opacityEditor,
        layerPaintControlsController.opacityValue,
      );
    });
    layerPaintControlsController.opacityEditor.addEventListener("toggle", () =>
      layerPaintControlsController.opacityValue.setAttribute(
        "aria-expanded",
        String(layerPaintControlsController.opacityEditor.matches(":popover-open")),
      ),
    );
    const layerEditor = document.createElement("div");
    layerEditor.className = "asset-layer-editor asset-layer-edit-mode";
    layerEditor.id = `asset-layer-edit-mode-${context.asset.id}-${layer.number}`;
    const editorHeader = document.createElement("div");
    editorHeader.className = "asset-layer-edit-mode-header";
    const editorTitle = document.createElement("strong");
    editorTitle.textContent = `Element ${layer.number}`;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "asset-layer-editor-close";
    closeButton.setAttribute("aria-label", "Close element editor");
    closeButton.title = "Close element editor";
    closeButton.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
    editorHeader.append(editorTitle, closeButton);
    const strokeControls = document.createElement("div");
    strokeControls.className = "asset-layer-stroke-controls";
    const currentAttrs = layerPaintControlsController.currentEdits.attrs || {};
    const strokeLabel = document.createElement("label");
    const strokeInput = document.createElement("input");
    strokeInput.type = "color";
    strokeInput.value =
      normalizeSvgColor(
        layerPaintControlsController.currentEdits.paints.stroke ??
          resolveSvgPaint(layer.elementNode, "stroke", context.data.svg),
      ) || "#000000";
    strokeInput.setAttribute("aria-label", `Element ${layer.number} stroke color`);
    const { field: strokeWidthField } = createSteppedNumberField({
      value: currentAttrs["stroke-width"] ?? layer.elementNode.getAttribute("stroke-width") ?? "1",
      step: "0.01",
      ariaLabel: `Element ${layer.number} stroke width`,
      onChange: (next) => {
        if (next < 0) return;
        updateAssetLayerEdits(context.asset.id, layer.number, {
          paints: { stroke: strokeInput.value.toUpperCase() },
          attrs: { "stroke-width": String(next) },
        });
        context.onEdit?.(layer.number, assetLayerEdits.get(context.asset.id).get(layer.number));
      },
    });
    strokeInput.addEventListener("input", () => {
      updateAssetLayerEdits(context.asset.id, layer.number, {
        paints: { stroke: strokeInput.value.toUpperCase() },
      });
      context.onEdit?.(layer.number, assetLayerEdits.get(context.asset.id).get(layer.number));
    });
    strokeLabel.append(strokeInput, strokeWidthField);
    strokeControls.appendChild(strokeLabel);
    const attributes = document.createElement("dl");
    attributes.className = "asset-layer-attributes";
    const dimensions = document.createElement("div");
    dimensions.className = "asset-layer-dimensions";
    const dimensionsTitle = document.createElement("strong");
    dimensionsTitle.textContent = "Dimensions";
    const dimensionAttributes = document.createElement("dl");
    dimensionAttributes.className = "asset-layer-attributes asset-layer-dimensions-list";
    dimensions.append(dimensionsTitle, dimensionAttributes);
    const elementGeometryNames = new Set(SVG_ELEMENT_GEOMETRY_ATTRIBUTES.get(layer.element) || []);
    const appendDimensionAttribute = (name, value) => {
      const term = document.createElement("dt");
      term.textContent = name;
      const description = document.createElement("dd");
      if (GEOMETRY_ATTRIBUTES.has(name)) {
        const { field, input } = createGeometryField({
          value: currentAttrs[name] ?? value,
          ariaLabel: `Element ${layer.number} ${name}`,
          onChange: (next) => {
            updateAssetLayerEdits(context.asset.id, layer.number, { attrs: { [name]: next } });
            context.onEdit?.(layer.number, assetLayerEdits.get(context.asset.id).get(layer.number));
          },
        });
        context.geometryInputs.set(`${layer.number}:${name}`, input);
        description.appendChild(field);
      } else {
        const step = value.includes(".") ? "0.01" : "1";
        const { field } = createSteppedNumberField({
          value: currentAttrs[name] ?? value,
          step,
          ariaLabel: `Element ${layer.number} ${name}`,
          onChange: (next) => {
            updateAssetLayerEdits(context.asset.id, layer.number, {
              attrs: { [name]: String(next) },
            });
            context.onEdit?.(layer.number, assetLayerEdits.get(context.asset.id).get(layer.number));
          },
        });
        description.appendChild(field);
      }
      dimensionAttributes.append(term, description);
    };
    for (const [name, value] of enumerateElementAttributes(layer.element, layer.attributes)) {
      if (elementGeometryNames.has(name)) {
        appendDimensionAttribute(name, value);
        continue;
      }
      const term = document.createElement("dt");
      term.textContent = name;
      const description = document.createElement("dd");
      if (name === "stroke") {
        description.appendChild(strokeControls);
        attributes.append(term, description);
        continue;
      }
      const isColorAttr = name === "fill" || name === "stroke";
      const normalizedColor = isColorAttr
        ? normalizeSvgColor(layerPaintControlsController.currentEdits.paints[name] ?? value)
        : "";
      if (normalizedColor) {
        const field = document.createElement("span");
        field.className = "asset-layer-attr-color-field";
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.className = "asset-layer-color-input";
        colorInput.value = normalizedColor;
        colorInput.setAttribute("aria-label", `Element ${layer.number} ${name} color`);
        colorInput.addEventListener("click", (event) => event.stopPropagation());
        colorInput.addEventListener("keydown", (event) => event.stopPropagation());
        const valueText = document.createElement("code");
        valueText.textContent = normalizedColor;
        colorInput.addEventListener("input", () => {
          const nextValue = colorInput.value.toUpperCase();
          updateAssetLayerEdits(context.asset.id, layer.number, { paints: { [name]: nextValue } });
          valueText.textContent = nextValue;
          layerPaintControlsController.syncColorInputs(name, nextValue, colorInput);
          context.onEdit?.(layer.number, assetLayerEdits.get(context.asset.id).get(layer.number));
        });
        layerPaintControlsController.registerColorInput(name, colorInput, (nextValue) => {
          valueText.textContent = nextValue;
        });
        field.append(colorInput, valueText);
        description.appendChild(field);
      } else if (name === "opacity") {
        const initialOpacity =
          layerPaintControlsController.currentEdits.opacity ?? (value === "" ? 1 : Number(value));
        const { field, input } = createSteppedNumberField({
          value: String(initialOpacity),
          step: "0.01",
          ariaLabel: `Element ${layer.number} opacity`,
          onChange: (next) =>
            layerPaintControlsController.setOpacity(Math.min(1, Math.max(0, next))),
        });
        layerPaintControlsController.attrOpacityInput = input;
        description.appendChild(field);
      } else if (value !== "" && Number.isFinite(Number(value))) {
        const step = value.includes(".") ? "0.01" : "1";
        const { field } = createSteppedNumberField({
          value: currentAttrs[name] ?? value,
          step,
          ariaLabel: `Element ${layer.number} ${name}`,
          onChange: (next) => {
            updateAssetLayerEdits(context.asset.id, layer.number, {
              attrs: { [name]: String(next) },
            });
            context.onEdit?.(layer.number, assetLayerEdits.get(context.asset.id).get(layer.number));
          },
        });
        description.appendChild(field);
      } else {
        description.textContent = value;
      }
      attributes.append(term, description);
    }
    layerEditor.append(editorHeader, attributes, dimensions);
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "asset-layer-edit-button";
    editButton.setAttribute("aria-label", `Edit element ${layer.number}`);
    editButton.setAttribute("aria-controls", layerEditor.id);
    editButton.setAttribute("aria-expanded", "false");
    editButton.title = `Edit element ${layer.number}`;
    editButton.innerHTML = '<i data-lucide="pencil" aria-hidden="true"></i>';
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      context.root.hidden = true;
      context.editorPanel.replaceChildren(layerEditor);
      context.editorPanel.hidden = false;
      editButton.setAttribute("aria-expanded", "true");
      if (typeof lucide !== "undefined") lucide.createIcons();
      context.editorPanel.scrollIntoView({ block: "nearest" });
      closeButton.focus();
    });
    closeButton.addEventListener("click", () => {
      context.editorPanel.hidden = true;
      context.editorPanel.replaceChildren();
      context.root.hidden = false;
      editButton.setAttribute("aria-expanded", "false");
      editButton.focus();
    });
    layerPaintControlsController.details.appendChild(layerPaintControlsController.paints);
    layerPaintControlsController.details.append(
      layerPaintControlsController.opacityValue,
      editButton,
      layerPaintControlsController.opacityEditor,
    );
    item.appendChild(selectLabel);
    item.appendChild(number);
    item.appendChild(reorder);
    item.appendChild(identity);
    item.appendChild(layerPaintControlsController.details);
    context.layerItems.set(layer.number, item);
    context.layerCheckboxes.set(layer.number, selectCheckbox);
    context.layerEditButtons.set(layer.number, editButton);
    if (context.onHighlight) context.layerButtons.set(layer.number, number);
    return item;
  }
  return {
    renderElementRow,
  };
}

import { normalizeSvgColor } from "../svg/analysis.js";
import { updateAssetLayerEdits } from "../svg/apply-edits.js";
import { assetLayerEdits } from "../svg/editor-state.js";
import type { LayerBindings } from "../controller-types.js";
import type { LayerEdit } from "../types.js";
import { createElement } from "react";
import { AnchoredPopover, RangeNumberControl } from "@wm-asset-workflows/ui-components";

export function createLayerPaintControls(
  context: Pick<LayerBindings, "presentation" | "layerEdits" | "layer" | "asset" | "onEdit">,
) {
  const details = document.createElement("div");
  details.className = "asset-layer-details";
  const paints = document.createElement("div");
  paints.className = "asset-layer-paints";
  const currentEdits: LayerEdit = context.layerEdits.get(context.layer.number) || {
    paints: {},
    attrs: {},
  };
  let firstColorInput = null;
  const colorInputsByProperty = new Map();
  const registerColorInput = (property, input, onSync) => {
    if (!colorInputsByProperty.has(property)) colorInputsByProperty.set(property, []);
    colorInputsByProperty.get(property).push({ input, onSync });
  };
  const syncColorInputs = (property, nextValue, sourceInput) => {
    for (const entry of colorInputsByProperty.get(property) || []) {
      if (entry.input !== sourceInput) entry.input.value = nextValue;
      entry.onSync?.(nextValue);
    }
  };
  for (const [property, value] of context.layer.paints) {
    const editedValue = currentEdits.paints[property] || value;
    const paint = document.createElement("span");
    paint.className = "asset-layer-paint";
    const color = normalizeSvgColor(editedValue);
    const label = document.createElement("code");
    label.textContent = color ? property : `${property} ${editedValue}`;
    paint.appendChild(label);
    if (color) {
      const colorInput = document.createElement("input");
      colorInput.className = "asset-layer-color-input";
      colorInput.type = "color";
      colorInput.id = `asset-layer-color-input-${context.asset.id}-${context.layer.number}-${property}`;
      colorInput.value = color;
      colorInput.setAttribute("aria-label", `Element ${context.layer.number} ${property} color`);
      colorInput.addEventListener("click", (event) => event.stopPropagation());
      colorInput.addEventListener("keydown", (event) => event.stopPropagation());
      colorInput.addEventListener("input", () => {
        const nextValue = colorInput.value.toUpperCase();
        updateAssetLayerEdits(context.asset.id, context.layer.number, {
          paints: { [property]: nextValue },
        });
        label.textContent = property;
        syncColorInputs(property, nextValue, colorInput);
        context.onEdit?.(
          context.layer.number,
          assetLayerEdits.get(context.asset.id).get(context.layer.number),
        );
      });
      paint.appendChild(colorInput);
      registerColorInput(property, colorInput);
      if (!firstColorInput) firstColorInput = colorInput;
    }
    paints.appendChild(paint);
  }
  const opacityValue = document.createElement("button");
  const anchorRef = { current: opacityValue };
  const opacityHost = document.createElement("span");
  opacityHost.style.display = "contents";
  let attrOpacityInput = null;
  const setOpacity = (value) => {
    const nextOpacity = Number(value);
    if (!Number.isFinite(nextOpacity) || nextOpacity < 0 || nextOpacity > 1) return;
    opacityInput.value = String(nextOpacity);
    opacitySlider.value = String(nextOpacity);
    if (attrOpacityInput) attrOpacityInput.value = String(nextOpacity);
    updateAssetLayerEdits(context.asset.id, context.layer.number, { opacity: nextOpacity });
    opacityValue.lastChild.textContent = String(nextOpacity);
    context.onEdit?.(
      context.layer.number,
      assetLayerEdits.get(context.asset.id).get(context.layer.number),
    );
  };
  context.presentation.mount(
    opacityHost,
    createElement(AnchoredPopover, {
      anchorRef,
      id: `asset-layer-opacity-editor-${context.asset.id}-${context.layer.number}`,
      className: "asset-layer-editor asset-layer-opacity-editor",
      "aria-label": `Edit element ${context.layer.number} opacity`,
      children: createElement(RangeNumberControl, {
        label: "Opacity",
        inputLabel: `Element ${context.layer.number} opacity`,
        decreaseLabel: "Decrease opacity",
        increaseLabel: "Increase opacity",
        defaultValue:
          currentEdits.opacity ??
          (context.layer.opacity === "" ? 1 : Number(context.layer.opacity)),
        min: 0,
        max: 1,
        step: 0.01,
        className: "asset-layer-opacity-control",
        stopPropagation: true,
        onValueChange: setOpacity,
      }),
    }),
  );
  const opacityEditor = opacityHost.querySelector<HTMLDivElement>(".wm-anchored-popover");
  const opacityInput = opacityHost.querySelector<HTMLInputElement>('input[type="number"]');
  const opacitySlider = opacityHost.querySelector<HTMLInputElement>('input[type="range"]');
  if (!opacityEditor || !opacityInput || !opacitySlider)
    throw new Error("Opacity controls did not mount.");
  return {
    opacityValue,
    opacityEditor,
    opacityHost,
    opacityInput,
    currentEdits,
    syncColorInputs,
    registerColorInput,
    setOpacity,
    get attrOpacityInput() {
      return attrOpacityInput;
    },
    set attrOpacityInput(value) {
      attrOpacityInput = value;
    },
    details,
    paints,
  };
}

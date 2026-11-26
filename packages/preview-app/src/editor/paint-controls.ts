import { normalizeSvgColor } from "../svg/analysis.js";
import { updateAssetLayerEdits } from "../svg/apply-edits.js";
import { assetLayerEdits } from "../svg/editor-state.js";
import type { LayerBindings } from "../controller-types.js";
import type { LayerEdit } from "../types.js";

export function createLayerPaintControls(
  context: Pick<LayerBindings, "layerEdits" | "layer" | "asset" | "onEdit">,
) {
  const details = document.createElement("div");
  details.className = "asset-layer-details";
  const paints = document.createElement("div");
  paints.className = "asset-layer-paints";
  const positionPopover = (popover, trigger) => {
    if (!popover.matches(":popover-open")) popover.showPopover();
    const triggerBounds = trigger.getBoundingClientRect();
    const popoverBounds = popover.getBoundingClientRect();
    popover.style.top = `${Math.min(triggerBounds.bottom + 6, window.innerHeight - popoverBounds.height - 8)}px`;
    popover.style.left = `${Math.max(8, Math.min(triggerBounds.left, window.innerWidth - popoverBounds.width - 8))}px`;
  };
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
  const opacityEditor = document.createElement("div");
  opacityEditor.className = "asset-layer-editor asset-layer-opacity-editor";
  opacityEditor.id = `asset-layer-opacity-editor-${context.asset.id}-${context.layer.number}`;
  opacityEditor.setAttribute("popover", "auto");
  opacityEditor.setAttribute("role", "dialog");
  opacityEditor.setAttribute("aria-label", `Edit element ${context.layer.number} opacity`);
  const opacityControl = document.createElement("label");
  opacityControl.className = "asset-layer-opacity-control";
  opacityControl.textContent = "Opacity";
  const decrement = document.createElement("button");
  decrement.type = "button";
  decrement.className = "asset-layer-opacity-step";
  decrement.setAttribute("aria-label", "Decrease opacity");
  decrement.innerHTML = '<i data-lucide="minus" aria-hidden="true"></i>';
  const opacitySlider = document.createElement("input");
  opacitySlider.type = "range";
  opacitySlider.min = "0";
  opacitySlider.max = "1";
  opacitySlider.step = "0.01";
  const opacityInput = document.createElement("input");
  opacityInput.type = "number";
  opacityInput.min = "0";
  opacityInput.max = "1";
  opacityInput.step = "0.01";
  opacityInput.value = String(
    currentEdits.opacity ?? (context.layer.opacity === "" ? 1 : Number(context.layer.opacity)),
  );
  opacitySlider.value = opacityInput.value;
  opacityInput.setAttribute("aria-label", `Element ${context.layer.number} opacity`);
  opacityInput.addEventListener("click", (event) => event.stopPropagation());
  opacityInput.addEventListener("keydown", (event) => event.stopPropagation());
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
  opacityInput.addEventListener("input", () => setOpacity(opacityInput.value));
  opacitySlider.addEventListener("input", () => setOpacity(opacitySlider.value));
  decrement.addEventListener("click", () =>
    setOpacity(Math.max(0, Number(opacityInput.value) - 0.01)),
  );
  const increment = document.createElement("button");
  increment.type = "button";
  increment.className = "asset-layer-opacity-step";
  increment.setAttribute("aria-label", "Increase opacity");
  increment.innerHTML = '<i data-lucide="plus" aria-hidden="true"></i>';
  increment.addEventListener("click", () =>
    setOpacity(Math.min(1, Number(opacityInput.value) + 0.01)),
  );
  opacityControl.append(decrement, opacitySlider, opacityInput, increment);
  opacityEditor.appendChild(opacityControl);
  const opacityValue = document.createElement("button");
  return {
    opacityValue,
    opacityEditor,
    opacityInput,
    positionPopover,
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

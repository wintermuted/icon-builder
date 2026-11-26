import type { CanvasBindings } from "../controller-types.js";

export function createCanvasHandles(
  context: Pick<
    CanvasBindings,
    "handles" | "previewContainer" | "getGraphics" | "layersController"
  >,
) {
  const handleNames = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const handleElements = new Map();
  let rotateHandleEl = null;
  let rotateLineEl = null;
  if (context.handles) {
    context.handles.replaceChildren();
    for (const name of handleNames) {
      const handleEl = document.createElement("div");
      handleEl.className = `asset-resize-handle asset-resize-handle--${name}`;
      handleEl.dataset.handle = name;
      context.handles.appendChild(handleEl);
      handleElements.set(name, handleEl);
    }
    rotateLineEl = document.createElement("div");
    rotateLineEl.className = "asset-rotate-handle-line";
    context.handles.appendChild(rotateLineEl);
    rotateHandleEl = document.createElement("div");
    rotateHandleEl.className = "asset-rotate-handle";
    rotateHandleEl.dataset.handle = "rotate";
    context.handles.appendChild(rotateHandleEl);
  }

  const ROTATE_HANDLE_OFFSET = 24;

  // Returns the union of every selected element's screen-space bounding box
  // (relative to previewContainer), so the handles box expands to encompass
  // the whole multi-selection rather than just the primary element.
  const getSelectionScreenBox = (layerNumbers) => {
    const containerRect = context.previewContainer.getBoundingClientRect();
    const graphics = context.getGraphics();
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    let found = false;
    for (const layerNumber of layerNumbers) {
      const element = graphics[layerNumber - 1];
      if (!element || !element.isConnected) continue;
      const rect = element.getBoundingClientRect();
      left = Math.min(left, rect.left);
      top = Math.min(top, rect.top);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
      found = true;
    }
    if (!found) return null;
    return {
      left: left - containerRect.left,
      top: top - containerRect.top,
      right: right - containerRect.left,
      bottom: bottom - containerRect.top,
    };
  };

  const updateHandles = (layerNumber) => {
    if (!context.handles) return;
    const multiSelected = context.layersController.getMultiSelection?.() || [];
    const layerNumbers =
      multiSelected.length > 1
        ? multiSelected
        : layerNumber === null || layerNumber === undefined
          ? []
          : [layerNumber];
    if (!layerNumbers.length) {
      context.handles.hidden = true;
      return;
    }
    const box = getSelectionScreenBox(layerNumbers);
    if (!box) {
      context.handles.hidden = true;
      return;
    }
    const { left, top, right, bottom } = box;
    const midX = (left + right) / 2;
    const midY = (top + bottom) / 2;
    const positions = {
      nw: [left, top],
      n: [midX, top],
      ne: [right, top],
      e: [right, midY],
      se: [right, bottom],
      s: [midX, bottom],
      sw: [left, bottom],
      w: [left, midY],
    };
    for (const [name, handleEl] of handleElements) {
      const [x, y] = positions[name];
      handleEl.style.left = `${x}px`;
      handleEl.style.top = `${y}px`;
    }
    // Rotating a multi-element group as a single unit isn't supported yet, so
    // hide the rotate handle rather than let it silently rotate just one
    // element out from under an apparent group selection.
    const isGroup = layerNumbers.length > 1;
    if (rotateHandleEl) {
      rotateHandleEl.style.left = `${midX}px`;
      rotateHandleEl.style.top = `${top - ROTATE_HANDLE_OFFSET}px`;
      rotateHandleEl.hidden = isGroup;
    }
    if (rotateLineEl) {
      rotateLineEl.style.left = `${midX}px`;
      rotateLineEl.style.top = `${top - ROTATE_HANDLE_OFFSET}px`;
      rotateLineEl.style.height = `${ROTATE_HANDLE_OFFSET}px`;
      rotateLineEl.hidden = isGroup;
    }
    context.handles.classList.toggle("is-group", isGroup);
    context.handles.hidden = false;
  };
  return {
    updateHandles,
  };
}

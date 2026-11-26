import { assetLayerEdits } from "../svg/editor-state.js";
import type { CanvasBindings } from "../controller-types.js";

function positionPrimaryTooltip(tooltip, container, element) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const gap = 8;
  const relLeft = elementRect.left - containerRect.left;
  const relTop = elementRect.top - containerRect.top;
  const relRight = elementRect.right - containerRect.left;
  const relBottom = elementRect.bottom - containerRect.top;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  let left = relRight + gap;
  let top = relBottom + gap;
  if (left + tooltipWidth > containerRect.width || top + tooltipHeight > containerRect.height) {
    left = relLeft - gap - tooltipWidth;
    top = relTop - gap - tooltipHeight;
  }
  left = Math.max(4, Math.min(left, containerRect.width - tooltipWidth - 4));
  top = Math.max(4, Math.min(top, containerRect.height - tooltipHeight - 4));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

export function createCanvasTooltip(
  context: Pick<
    CanvasBindings,
    | "shapeEditLayerNumber"
    | "exitShapeEditMode"
    | "handles"
    | "updatePointHandles"
    | "updateGridOverlay"
    | "updateShapeModeBanner"
    | "updateHandles"
    | "tooltip"
    | "getGraphics"
    | "asset"
    | "previewContainer"
  >,
) {
  const updateTooltip = (layerNumber) => {
    if (context.shapeEditLayerNumber !== null && layerNumber !== context.shapeEditLayerNumber)
      context.exitShapeEditMode();
    if (context.shapeEditLayerNumber !== null) {
      if (context.handles) context.handles.hidden = true;
      context.updatePointHandles();
      context.updateGridOverlay();
      context.updateShapeModeBanner();
    } else {
      context.updateHandles(layerNumber);
    }
    if (!context.tooltip) return;
    if (layerNumber === null || layerNumber === undefined) {
      context.tooltip.hidden = true;
      return;
    }
    const element = context.getGraphics()[layerNumber - 1];
    if (!element || !element.isConnected) {
      context.tooltip.hidden = true;
      return;
    }
    const edit = assetLayerEdits.get(context.asset.id)?.get(layerNumber);
    let bbox = { x: 0, y: 0, width: 0, height: 0 };
    try {
      bbox = element.getBBox();
    } catch {
      /* element may not be renderable yet */
    }
    const box = edit?.resize ?? {
      left: bbox.x,
      top: bbox.y,
      right: bbox.x + bbox.width,
      bottom: bbox.y + bbox.height,
    };
    const x = box.left + (edit?.offsetX ?? 0);
    const y = box.top + (edit?.offsetY ?? 0);
    const width = box.right - box.left;
    const height = box.bottom - box.top;
    context.tooltip.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = `Element ${layerNumber} · ${element.localName}`;
    const position = document.createElement("span");
    position.textContent = `X ${Math.round(x)}, Y ${Math.round(y)}`;
    const size = document.createElement("span");
    size.textContent = `${Math.round(width)} × ${Math.round(height)}`;
    context.tooltip.append(title, position, size);
    if (edit?.rotation) {
      const rotation = document.createElement("span");
      rotation.textContent = `${Math.round(edit.rotation % 360)}°`;
      context.tooltip.append(rotation);
    }
    context.tooltip.hidden = false;
    positionPrimaryTooltip(context.tooltip, context.previewContainer, element);
  };
  return {
    updateTooltip,
  };
}

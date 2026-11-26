import { assetLayerEdits } from "../svg/editor-state.js";
import type { CanvasBindings } from "../controller-types.js";

export function createResizeGestures(
  context: Pick<
    CanvasBindings,
    | "getGraphics"
    | "asset"
    | "groupResizeState"
    | "getUnitsPerPixel"
    | "layersController"
    | "rotateState"
    | "resizeState"
  >,
) {
  const getElementResizeSnapshot = (layerNumber) => {
    const element = context.getGraphics()[layerNumber - 1];
    if (!element) return null;
    let nativeBBox;
    try {
      nativeBBox = element.getBBox();
    } catch {
      return null;
    }
    if (!nativeBBox) return null;
    const edit = assetLayerEdits.get(context.asset.id)?.get(layerNumber);
    const offsetX = edit?.offsetX || 0;
    const offsetY = edit?.offsetY || 0;
    const base = edit?.resize ?? {
      left: nativeBBox.x,
      top: nativeBBox.y,
      right: nativeBBox.x + nativeBBox.width,
      bottom: nativeBBox.y + nativeBBox.height,
    };
    return {
      layerNumber,
      nativeBBox,
      offsetX,
      offsetY,
      base,
      adjusted: {
        left: base.left + offsetX,
        top: base.top + offsetY,
        right: base.right + offsetX,
        bottom: base.bottom + offsetY,
      },
    };
  };

  const startGroupResize = (handleName, layerNumbers, event) => {
    const entries = layerNumbers.map(getElementResizeSnapshot).filter(Boolean);
    if (entries.length < 2) return;
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    for (const entry of entries) {
      left = Math.min(left, entry.adjusted.left);
      top = Math.min(top, entry.adjusted.top);
      right = Math.max(right, entry.adjusted.right);
      bottom = Math.max(bottom, entry.adjusted.bottom);
    }
    context.groupResizeState = {
      pointerId: event.pointerId,
      handle: handleName,
      startX: event.clientX,
      startY: event.clientY,
      unitsPerPixel: context.getUnitsPerPixel(),
      initialBox: { left, top, right, bottom },
      entries,
    };
    event.target.setPointerCapture?.(event.pointerId);
  };

  const onHandlePointerDown = (event) => {
    const handleName = event.target?.dataset?.handle;
    if (!handleName) return;
    event.stopPropagation();
    event.preventDefault();
    const multiSelected = context.layersController.getMultiSelection?.() || [];
    if (multiSelected.length > 1) {
      // Group rotation isn't supported (the rotate handle is hidden whenever
      // a group is selected - see updateHandles), so this branch only ever
      // needs to handle resize handles.
      if (handleName === "rotate") return;
      startGroupResize(handleName, multiSelected, event);
      return;
    }
    const layerNumber = context.layersController.getSelectedLayer();
    if (layerNumber === null || layerNumber === undefined) return;
    const element = context.getGraphics()[layerNumber - 1];
    if (!element) return;
    if (handleName === "rotate") {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const existingRotation =
        assetLayerEdits.get(context.asset.id)?.get(layerNumber)?.rotation || 0;
      context.rotateState = {
        layerNumber,
        pointerId: event.pointerId,
        centerX,
        centerY,
        startAngleDeg: existingRotation,
        startPointerAngleDeg:
          Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI),
      };
      event.target.setPointerCapture?.(event.pointerId);
      return;
    }
    let nativeBBox;
    try {
      nativeBBox = element.getBBox();
    } catch {
      return;
    }
    if (!nativeBBox) return;
    const unitsPerPixel = context.getUnitsPerPixel();
    const existingResize = assetLayerEdits.get(context.asset.id)?.get(layerNumber)?.resize;
    // The native box is captured fresh every drag (getBBox() ignores the
    // element's own transform, so this is always the untransformed geometry).
    // If a previous resize already exists, its stored current edges continue
    // to describe the effective (scaled) box relative to THIS native box - but
    // only if the native box hasn't changed shape since. Guard against that by
    // falling back to the fresh native box when there's no existing resize.
    const currentBox = existingResize ?? {
      left: nativeBBox.x,
      top: nativeBBox.y,
      right: nativeBBox.x + nativeBBox.width,
      bottom: nativeBBox.y + nativeBBox.height,
    };
    context.resizeState = {
      layerNumber,
      pointerId: event.pointerId,
      handle: handleName,
      startX: event.clientX,
      startY: event.clientY,
      nativeBBox,
      currentBox,
      unitsPerPixel,
    };
    event.target.setPointerCapture?.(event.pointerId);
  };
  return {
    onHandlePointerDown,
  };
}

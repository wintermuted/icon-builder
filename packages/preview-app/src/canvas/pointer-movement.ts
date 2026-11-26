import { updateAssetLayerEdits, applyAssetLayerEdits } from "../svg/apply-edits.js";
import type { CanvasBindings } from "../controller-types.js";

export function createPointerMovement(
  context: Pick<
    CanvasBindings,
    | "rotateState"
    | "asset"
    | "root"
    | "updateTooltip"
    | "onLayerEdited"
    | "groupResizeState"
    | "syncLayerDimensions"
    | "updateHandles"
    | "layersController"
    | "resizeState"
    | "gridEnabled"
    | "snapToGrid"
    | "clearGuides"
    | "getGraphics"
    | "getAlignmentTargets"
    | "getElementEdges"
    | "findAxisSnap"
    | "showGuide"
    | "dragState"
  >,
) {
  const onPointerMove = (event) => {
    if (context.rotateState && event.pointerId === context.rotateState.pointerId) {
      const { centerX, centerY, startAngleDeg, startPointerAngleDeg, layerNumber } =
        context.rotateState;
      const pointerAngleDeg =
        Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
      let rotation = startAngleDeg + (pointerAngleDeg - startPointerAngleDeg);
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15; // snap to 15° increments
      updateAssetLayerEdits(context.asset.id, layerNumber, { rotation });
      applyAssetLayerEdits(context.root.querySelector("svg"), context.asset.id);
      context.updateTooltip(layerNumber);
      context.onLayerEdited?.();
      return;
    }
    if (context.groupResizeState && event.pointerId === context.groupResizeState.pointerId) {
      const { handle, unitsPerPixel, initialBox, entries, startX, startY } =
        context.groupResizeState;
      const dxLocal = (event.clientX - startX) * unitsPerPixel.x;
      const dyLocal = (event.clientY - startY) * unitsPerPixel.y;
      const minSize = 4;
      let { left, top, right, bottom } = initialBox;
      // Only the edges implicated by the dragged handle move, exactly like
      // single-element resize - the fixed anchor side(s) of the group box
      // never move.
      if (handle.includes("e")) right = Math.max(left + minSize, right + dxLocal);
      if (handle.includes("w")) left = Math.min(right - minSize, left + dxLocal);
      if (handle.includes("s")) bottom = Math.max(top + minSize, bottom + dyLocal);
      if (handle.includes("n")) top = Math.min(bottom - minSize, top + dyLocal);
      const initWidth = initialBox.right - initialBox.left;
      const initHeight = initialBox.bottom - initialBox.top;
      if (event.shiftKey && initWidth > 0 && initHeight > 0) {
        // Lock the whole group's box to its own starting aspect ratio, same
        // approach as single-element resize but applied to the group box.
        const aspect = initWidth / initHeight;
        const touchesX = handle.includes("e") || handle.includes("w");
        const touchesY = handle.includes("n") || handle.includes("s");
        if (touchesX && touchesY) {
          const dominant = Math.abs(dxLocal) >= Math.abs(dyLocal) ? "x" : "y";
          if (dominant === "x") {
            const height = Math.max(minSize, (right - left) / aspect);
            if (handle.includes("s")) bottom = top + height;
            else top = bottom - height;
          } else {
            const width = Math.max(minSize, (bottom - top) * aspect);
            if (handle.includes("e")) right = left + width;
            else left = right - width;
          }
        } else if (touchesX) {
          const height = Math.max(minSize, (right - left) / aspect);
          const centerY = (initialBox.top + initialBox.bottom) / 2;
          top = centerY - height / 2;
          bottom = centerY + height / 2;
        } else if (touchesY) {
          const width = Math.max(minSize, (bottom - top) * aspect);
          const centerX = (initialBox.left + initialBox.right) / 2;
          left = centerX - width / 2;
          right = centerX + width / 2;
        }
      }
      // Scale every selected element's box proportionally within the new
      // group box, using each element's position relative to the *initial*
      // group box so repeatedly resizing keeps all elements moving in
      // lockstep rather than compounding drift.
      const scaleX = initWidth > 0 ? (right - left) / initWidth : 1;
      const scaleY = initHeight > 0 ? (bottom - top) / initHeight : 1;
      for (const entry of entries) {
        const { layerNumber, nativeBBox, offsetX, offsetY, adjusted } = entry;
        const newLeft = left + (adjusted.left - initialBox.left) * scaleX;
        const newRight = left + (adjusted.right - initialBox.left) * scaleX;
        const newTop = top + (adjusted.top - initialBox.top) * scaleY;
        const newBottom = top + (adjusted.bottom - initialBox.top) * scaleY;
        updateAssetLayerEdits(context.asset.id, layerNumber, {
          resize: {
            nativeLeft: nativeBBox.x,
            nativeTop: nativeBBox.y,
            nativeWidth: nativeBBox.width,
            nativeHeight: nativeBBox.height,
            // `resize` edits are stored pre-offset (see the single-element
            // resize path below), so the element's own unchanged offsetX/Y
            // is subtracted back out here.
            left: newLeft - offsetX,
            top: newTop - offsetY,
            right: newRight - offsetX,
            bottom: newBottom - offsetY,
          },
        });
      }
      applyAssetLayerEdits(context.root.querySelector("svg"), context.asset.id);
      for (const entry of entries) context.syncLayerDimensions(entry.layerNumber);
      context.updateHandles(context.layersController.getSelectedLayer());
      context.onLayerEdited?.();
      return;
    }
    if (context.resizeState && event.pointerId === context.resizeState.pointerId) {
      const { handle, nativeBBox, currentBox, unitsPerPixel, layerNumber, startX, startY } =
        context.resizeState;
      const dxLocal = (event.clientX - startX) * unitsPerPixel.x;
      const dyLocal = (event.clientY - startY) * unitsPerPixel.y;
      const minSize = 2;
      let { left, top, right, bottom } = currentBox;
      // Only the edges implicated by the dragged handle move; edges not being
      // dragged keep their previously stored value, so switching handles
      // between separate resize operations never disturbs the fixed side(s).
      if (handle.includes("e")) right = Math.max(left + minSize, right + dxLocal);
      if (handle.includes("w")) left = Math.min(right - minSize, left + dxLocal);
      if (handle.includes("s")) bottom = Math.max(top + minSize, bottom + dyLocal);
      if (handle.includes("n")) top = Math.min(bottom - minSize, top + dyLocal);
      if (event.shiftKey && nativeBBox.width > 0 && nativeBBox.height > 0) {
        // Lock the box to the element's native aspect ratio. Corner handles
        // already touch both axes, so whichever axis the pointer moved
        // further along drives the locked dimension, recomputed from the
        // fixed anchor edge implied by the handle. Edge handles only touch
        // one axis normally; with the ratio locked they also grow/shrink the
        // perpendicular axis, centered on the box's current midpoint since an
        // edge handle has no natural anchor on that axis.
        const nativeAspect = nativeBBox.width / nativeBBox.height;
        const touchesX = handle.includes("e") || handle.includes("w");
        const touchesY = handle.includes("n") || handle.includes("s");
        if (touchesX && touchesY) {
          const dominant = Math.abs(dxLocal) >= Math.abs(dyLocal) ? "x" : "y";
          if (dominant === "x") {
            const height = Math.max(minSize, (right - left) / nativeAspect);
            if (handle.includes("s")) bottom = top + height;
            else top = bottom - height;
          } else {
            const width = Math.max(minSize, (bottom - top) * nativeAspect);
            if (handle.includes("e")) right = left + width;
            else left = right - width;
          }
        } else if (touchesX) {
          const height = Math.max(minSize, (right - left) / nativeAspect);
          const centerY = (currentBox.top + currentBox.bottom) / 2;
          top = centerY - height / 2;
          bottom = centerY + height / 2;
        } else if (touchesY) {
          const width = Math.max(minSize, (bottom - top) * nativeAspect);
          const centerX = (currentBox.left + currentBox.right) / 2;
          left = centerX - width / 2;
          right = centerX + width / 2;
        }
      }
      if (context.gridEnabled) {
        if (handle.includes("e")) right = Math.max(left + minSize, context.snapToGrid(right));
        if (handle.includes("w")) left = Math.min(right - minSize, context.snapToGrid(left));
        if (handle.includes("s")) bottom = Math.max(top + minSize, context.snapToGrid(bottom));
        if (handle.includes("n")) top = Math.min(bottom - minSize, context.snapToGrid(top));
      }
      const applyResize = (box) => {
        updateAssetLayerEdits(context.asset.id, layerNumber, {
          resize: {
            nativeLeft: nativeBBox.x,
            nativeTop: nativeBBox.y,
            nativeWidth: nativeBBox.width,
            nativeHeight: nativeBBox.height,
            ...box,
          },
        });
        applyAssetLayerEdits(context.root.querySelector("svg"), context.asset.id);
        context.syncLayerDimensions(layerNumber);
        context.onLayerEdited?.();
      };
      applyResize({ left, top, right, bottom });
      // Snap whichever edges the dragged handle actually moves against the
      // edges/centers of other elements and the artboard; edges the handle
      // doesn't touch are left alone so the fixed anchor side never moves.
      context.clearGuides();
      if (!event.ctrlKey && !event.metaKey) {
        const element = context.getGraphics()[layerNumber - 1];
        if (element) {
          const targets = context.getAlignmentTargets(layerNumber - 1);
          const activeEdges = context.getElementEdges(element);
          let snappedX = false;
          let snappedY = false;
          if (handle.includes("e")) {
            const snap = context.findAxisSnap(activeEdges, ["right"], targets);
            if (snap) {
              right += snap.delta * unitsPerPixel.x;
              snappedX = true;
              context.showGuide("v", snap.screenPos);
            }
          } else if (handle.includes("w")) {
            const snap = context.findAxisSnap(activeEdges, ["left"], targets);
            if (snap) {
              left += snap.delta * unitsPerPixel.x;
              snappedX = true;
              context.showGuide("v", snap.screenPos);
            }
          }
          if (handle.includes("s")) {
            const snap = context.findAxisSnap(activeEdges, ["bottom"], targets);
            if (snap) {
              bottom += snap.delta * unitsPerPixel.y;
              snappedY = true;
              context.showGuide("h", snap.screenPos);
            }
          } else if (handle.includes("n")) {
            const snap = context.findAxisSnap(activeEdges, ["top"], targets);
            if (snap) {
              top += snap.delta * unitsPerPixel.y;
              snappedY = true;
              context.showGuide("h", snap.screenPos);
            }
          }
          if (snappedX || snappedY) applyResize({ left, top, right, bottom });
        }
      }
      context.updateTooltip(layerNumber);
      return;
    }
    if (!context.dragState || event.pointerId !== context.dragState.pointerId) return;
    const dx = event.clientX - context.dragState.startX;
    const dy = event.clientY - context.dragState.startY;
    if (Math.hypot(dx, dy) > 2) context.dragState.moved = true;
    let deltaX = dx * context.dragState.scaleX;
    let deltaY = dy * context.dragState.scaleY;
    // Every dragged element (a group of one for a normal single-element
    // drag) moves by the same delta relative to its own starting offset, so
    // the whole multi-selection stays in lockstep rather than compounding
    // drift across pointermove events.
    const applyGroupOffset = (offsetDx, offsetDy) => {
      for (const layerNumber of context.dragState.layerNumbers) {
        const base = context.dragState.bases.get(layerNumber);
        updateAssetLayerEdits(context.asset.id, layerNumber, {
          offsetX: base.offsetX + offsetDx,
          offsetY: base.offsetY + offsetDy,
        });
      }
      applyAssetLayerEdits(context.root.querySelector("svg"), context.asset.id);
      for (const layerNumber of context.dragState.layerNumbers)
        context.syncLayerDimensions(layerNumber);
      context.onLayerEdited?.();
    };
    applyGroupOffset(deltaX, deltaY);
    // Snap the union of every dragged element's edges/centers to other
    // (non-dragged) elements and the artboard on both axes independently.
    context.clearGuides();
    if (!event.ctrlKey && !event.metaKey) {
      const graphics = context.getGraphics();
      const excludeIndices = context.dragState.layerNumbers.map((n) => n - 1);
      const targets = context.getAlignmentTargets(excludeIndices);
      let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;
      let found = false;
      for (const layerNumber of context.dragState.layerNumbers) {
        const element = graphics[layerNumber - 1];
        if (!element) continue;
        const edges = context.getElementEdges(element);
        left = Math.min(left, edges.left);
        top = Math.min(top, edges.top);
        right = Math.max(right, edges.right);
        bottom = Math.max(bottom, edges.bottom);
        found = true;
      }
      if (found) {
        const activeEdges = {
          left,
          right,
          centerX: (left + right) / 2,
          top,
          bottom,
          centerY: (top + bottom) / 2,
        };
        const xSnap = context.findAxisSnap(activeEdges, ["left", "right", "centerX"], targets);
        const ySnap = context.findAxisSnap(activeEdges, ["top", "bottom", "centerY"], targets);
        if (xSnap) {
          deltaX += xSnap.delta * context.dragState.scaleX;
          context.showGuide("v", xSnap.screenPos);
        }
        if (ySnap) {
          deltaY += ySnap.delta * context.dragState.scaleY;
          context.showGuide("h", ySnap.screenPos);
        }
        if (xSnap || ySnap) applyGroupOffset(deltaX, deltaY);
      }
    }
    if (context.gridEnabled) {
      const primaryBase = context.dragState.bases.get(context.dragState.primaryLayerNumber);
      if (primaryBase) {
        deltaX = context.snapToGrid(primaryBase.offsetX + deltaX) - primaryBase.offsetX;
        deltaY = context.snapToGrid(primaryBase.offsetY + deltaY) - primaryBase.offsetY;
        applyGroupOffset(deltaX, deltaY);
      }
    }
    context.updateTooltip(context.dragState.primaryLayerNumber);
  };
  return {
    onPointerMove,
  };
}

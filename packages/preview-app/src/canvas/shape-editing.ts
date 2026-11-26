import { assetLayerEdits } from "../svg/editor-state.js";
import { parseSvgPoints, POINT_EDITABLE_SHAPES, serializeSvgPoints } from "../svg/geometry.js";
import { updateAssetLayerEdits, applyAssetLayerEdits } from "../svg/apply-edits.js";
import type { CanvasBindings } from "../controller-types.js";

export function createShapeEditing(
  context: Pick<
    CanvasBindings,
    | "shapeEditLayerNumber"
    | "getGraphics"
    | "asset"
    | "points"
    | "previewContainer"
    | "gridOverlay"
    | "gridVisible"
    | "root"
    | "gridSize"
    | "gridEnabled"
    | "onLayerEdited"
    | "layersController"
    | "shapeModeBanner"
    | "pointDragState"
    | "updateHandles"
    | "handles"
  >,
) {
  const getShapeEditElement = () => {
    if (context.shapeEditLayerNumber === null) return null;
    const element = context.getGraphics()[context.shapeEditLayerNumber - 1];
    if (!element || !element.isConnected) return null;
    return element;
  };

  const getShapePoints = (element, layerNumber) => {
    if (element.localName === "line") {
      const edit = assetLayerEdits.get(context.asset.id)?.get(layerNumber)?.attrs || {};
      return [
        {
          x: Number(edit.x1 ?? element.getAttribute("x1") ?? 0),
          y: Number(edit.y1 ?? element.getAttribute("y1") ?? 0),
        },
        {
          x: Number(edit.x2 ?? element.getAttribute("x2") ?? 0),
          y: Number(edit.y2 ?? element.getAttribute("y2") ?? 0),
        },
      ];
    }
    const edited = assetLayerEdits.get(context.asset.id)?.get(layerNumber)?.attrs?.points;
    return parseSvgPoints(edited ?? element.getAttribute("points"));
  };

  // Points live in the element's own user space, so getScreenCTM (which folds in
  // every ancestor transform plus the element's edit transform) is the only
  // reliable way to line the handles up with what's rendered.
  const getShapeMatrix = (element) => {
    try {
      return element.getScreenCTM();
    } catch {
      return null;
    }
  };

  const updatePointHandles = () => {
    if (!context.points) return;
    const element = getShapeEditElement();
    const matrix = element && getShapeMatrix(element);
    if (!element || !matrix) {
      context.points.hidden = true;
      context.points.replaceChildren();
      return;
    }
    const containerRect = context.previewContainer.getBoundingClientRect();
    if (!POINT_EDITABLE_SHAPES.has(element.localName) && element.localName !== "line") {
      context.points.hidden = true;
      context.points.replaceChildren();
      return;
    }
    const shapePoints = getShapePoints(element, context.shapeEditLayerNumber);
    if (context.points.childElementCount !== shapePoints.length) {
      context.points.replaceChildren(
        ...shapePoints.map((_, index) => {
          const handleEl = document.createElement("button");
          handleEl.type = "button";
          handleEl.className = "asset-point-handle";
          handleEl.dataset.pointIndex = String(index);
          handleEl.setAttribute("aria-label", `Point ${index + 1}`);
          return handleEl;
        }),
      );
    }
    shapePoints.forEach((point, index) => {
      const handleEl = context.points.children[index];
      if (!handleEl) return;
      const screenX = matrix.a * point.x + matrix.c * point.y + matrix.e;
      const screenY = matrix.b * point.x + matrix.d * point.y + matrix.f;
      handleEl.style.left = `${screenX - containerRect.left}px`;
      handleEl.style.top = `${screenY - containerRect.top}px`;
    });
    context.points.hidden = false;
  };

  const updateGridOverlay = () => {
    if (!context.gridOverlay) return;
    if (!context.gridVisible) {
      context.gridOverlay.hidden = true;
      return;
    }
    const element = getShapeEditElement() || context.root.querySelector("svg");
    const matrix = element && getShapeMatrix(element);
    if (!matrix) {
      context.gridOverlay.hidden = true;
      return;
    }
    // Convert the grid spacing (SVG user units) to screen pixels using the
    // edited element's own screen matrix, so the overlay lines land exactly on
    // the coordinates points snap to, regardless of canvas zoom/size.
    const scaleX = Math.hypot(matrix.a, matrix.b);
    const scaleY = Math.hypot(matrix.c, matrix.d);
    const pixelX = Math.max(2, context.gridSize * scaleX);
    const pixelY = Math.max(2, context.gridSize * scaleY);
    // Anchor the pattern on user-space (0,0) rather than the container corner,
    // otherwise the drawn lines sit at an arbitrary offset from the snap targets.
    const containerRect = context.previewContainer.getBoundingClientRect();
    const originX = matrix.e - containerRect.left;
    const originY = matrix.f - containerRect.top;
    context.gridOverlay.style.setProperty("--asset-grid-size-x", `${pixelX}px`);
    context.gridOverlay.style.setProperty("--asset-grid-size-y", `${pixelY}px`);
    context.gridOverlay.style.setProperty("--asset-grid-origin-x", `${originX}px`);
    context.gridOverlay.style.setProperty("--asset-grid-origin-y", `${originY}px`);
    context.gridOverlay.hidden = false;
  };

  const snapToGrid = (value) =>
    context.gridEnabled ? Math.round(value / context.gridSize) * context.gridSize : value;

  const addShapeEditSide = () => {
    const element = getShapeEditElement();
    if (!element) return;
    const currentPoints = getShapePoints(element, context.shapeEditLayerNumber);
    if (currentPoints.length < 2) return;
    // Insert the new vertex at the midpoint of the longest edge so the added
    // side is visually meaningful rather than bunching points together.
    let longestIndex = 0;
    let longestLength = -Infinity;
    for (let i = 0; i < currentPoints.length; i += 1) {
      const a = currentPoints[i];
      const b = currentPoints[(i + 1) % currentPoints.length];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length > longestLength) {
        longestLength = length;
        longestIndex = i;
      }
    }
    const a = currentPoints[longestIndex];
    const b = currentPoints[(longestIndex + 1) % currentPoints.length];
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const nextPoints = [...currentPoints];
    nextPoints.splice(longestIndex + 1, 0, midpoint);
    const serialized = serializeSvgPoints(nextPoints);
    const attrs =
      element.localName === "line"
        ? index === 0
          ? { x1: String(x), y1: String(y) }
          : { x2: String(x), y2: String(y) }
        : { points: serialized };
    updateAssetLayerEdits(context.asset.id, context.shapeEditLayerNumber, { attrs });
    applyAssetLayerEdits(context.root.querySelector("svg"), context.asset.id);
    context.onLayerEdited?.();
    if (element.localName === "line") {
      context.layersController.syncGeometryInput?.(
        context.shapeEditLayerNumber,
        index === 0 ? "x1" : "x2",
        String(x),
      );
      context.layersController.syncGeometryInput?.(
        context.shapeEditLayerNumber,
        index === 0 ? "y1" : "y2",
        String(y),
      );
    } else {
      context.layersController.syncGeometryInput?.(
        context.shapeEditLayerNumber,
        "points",
        serialized,
      );
    }
    updatePointHandles();
  };

  const updateShapeModeBanner = () => {
    if (!context.shapeModeBanner) return;
    const element = getShapeEditElement();
    if (!element) {
      context.shapeModeBanner.hidden = true;
      context.shapeModeBanner.replaceChildren();
      return;
    }
    const label = document.createElement("span");
    const modeHint = POINT_EDITABLE_SHAPES.has(element.localName)
      ? "drag vertices"
      : element.localName === "line"
        ? "drag endpoints"
        : "edit geometry in the panel";
    label.textContent = `Shape edit mode · Element ${context.shapeEditLayerNumber} (${element.localName}) — ${modeHint}, Esc to exit`;
    const controls = document.createElement("span");
    controls.textContent = POINT_EDITABLE_SHAPES.has(element.localName)
      ? "Drag vertices"
      : element.localName === "line"
        ? "Drag endpoints"
        : "Use the element editor geometry controls";
    if (element.localName === "polygon" || element.localName === "polyline") {
      const addSideButton = document.createElement("button");
      addSideButton.type = "button";
      addSideButton.className = "asset-shape-mode-add-side";
      addSideButton.textContent = "+ Add side";
      addSideButton.title = "Add a point on the longest edge";
      addSideButton.addEventListener("pointerdown", (event) => event.stopPropagation());
      addSideButton.addEventListener("click", (event) => {
        event.stopPropagation();
        addShapeEditSide();
      });
      controls.append(" ", addSideButton);
    }
    context.shapeModeBanner.replaceChildren(label, controls);
    context.shapeModeBanner.hidden = false;
  };

  const exitShapeEditMode = () => {
    if (context.shapeEditLayerNumber === null) return;
    const element = getShapeEditElement();
    element?.classList.remove("is-shape-editing");
    context.shapeEditLayerNumber = null;
    context.pointDragState = null;
    updatePointHandles();
    updateShapeModeBanner();
    updateGridOverlay();
    context.updateHandles(context.layersController.getSelectedLayer());
  };

  const enterShapeEditMode = (layerNumber) => {
    if (context.shapeEditLayerNumber === layerNumber) return;
    exitShapeEditMode();
    const element = context.getGraphics()[layerNumber - 1];
    if (!element) return;
    context.shapeEditLayerNumber = layerNumber;
    element.classList.add("is-shape-editing");
    if (context.handles)
      context.handles.hidden =
        !POINT_EDITABLE_SHAPES.has(element.localName) && element.localName !== "line";
    updatePointHandles();
    updateShapeModeBanner();
    updateGridOverlay();
  };

  const onDoubleClick = (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest(":is(path, rect, circle, ellipse, line, polyline, polygon)")
        : null;
    if (!target) {
      exitShapeEditMode();
      return;
    }
    const layerNumber = context.getGraphics().indexOf(target) + 1;
    if (!layerNumber) return;
    event.preventDefault();
    context.layersController.selectLayer?.(layerNumber);
    context.layersController.openEditor?.(layerNumber);
    enterShapeEditMode(layerNumber);
  };

  const onPointPointerDown = (event) => {
    const handleEl =
      event.target instanceof Element ? event.target.closest(".asset-point-handle") : null;
    if (!handleEl) return;
    const element = getShapeEditElement();
    const matrix = element && getShapeMatrix(element);
    if (!element || !matrix) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      handleEl.setPointerCapture?.(event.pointerId);
    } catch {
      /* pointer already released */
    }
    handleEl.classList.add("is-active");
    context.pointDragState = {
      handleEl,
      pointerId: event.pointerId,
      index: Number(handleEl.dataset.pointIndex),
      inverse: matrix.inverse(),
      points: getShapePoints(element, context.shapeEditLayerNumber),
    };
  };

  const onPointPointerMove = (event) => {
    if (!context.pointDragState || event.pointerId !== context.pointDragState.pointerId) return;
    const { inverse, index } = context.pointDragState;
    const rawX = inverse.a * event.clientX + inverse.c * event.clientY + inverse.e;
    const rawY = inverse.b * event.clientX + inverse.d * event.clientY + inverse.f;
    const x = snapToGrid(rawX);
    const y = snapToGrid(rawY);
    const next = context.pointDragState.points.map((point, i) => (i === index ? { x, y } : point));
    context.pointDragState.points = next;
    const serialized = serializeSvgPoints(next);
    updateAssetLayerEdits(context.asset.id, context.shapeEditLayerNumber, {
      attrs: { points: serialized },
    });
    applyAssetLayerEdits(context.root.querySelector("svg"), context.asset.id);
    context.onLayerEdited?.();
    context.layersController.syncGeometryInput?.(
      context.shapeEditLayerNumber,
      "points",
      serialized,
    );
    updatePointHandles();
  };

  const onPointPointerUp = (event) => {
    if (!context.pointDragState || event.pointerId !== context.pointDragState.pointerId) return;
    try {
      context.pointDragState.handleEl.releasePointerCapture?.(event.pointerId);
    } catch {
      /* not captured */
    }
    context.pointDragState.handleEl.classList.remove("is-active");
    context.pointDragState = null;
  };
  return {
    exitShapeEditMode,
    updatePointHandles,
    updateGridOverlay,
    updateShapeModeBanner,
    snapToGrid,
    onPointPointerDown,
    onDoubleClick,
    onPointPointerMove,
    onPointPointerUp,
  };
}

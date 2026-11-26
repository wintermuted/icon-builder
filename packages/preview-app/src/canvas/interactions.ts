import { assetLayerEdits } from "../svg/editor-state.js";
import { createCanvasHandles } from "./handles.js";
import { createShapeEditing } from "./shape-editing.js";
import { createCanvasTooltip } from "./tooltip.js";
import { updateAssetLayerEdits, applyAssetLayerEdits } from "../svg/apply-edits.js";
import { createAlignmentGuides } from "./alignment.js";
import { createResizeGestures } from "./resize-start.js";
import { createPointerMovement } from "./pointer-movement.js";
import type { Asset, LayerController } from "../types.js";
import type { CanvasBindings } from "../controller-types.js";

export function enablePrimaryLayerInteraction(
  root: HTMLElement,
  previewContainer: HTMLElement,
  tooltip: HTMLElement,
  handles: HTMLElement,
  guides: HTMLElement,
  asset: Asset,
  layersController: LayerController,
  points: HTMLElement,
  shapeModeBanner: HTMLElement,
  gridOverlay: HTMLElement,
  gridVisibilityToggle: HTMLElement,
  gridSnapToggle: HTMLElement,
  gridSizeInput: HTMLInputElement,
  onLayerEdited: () => void,
) {
  const getGraphics = () => {
    const svg = root.querySelector("svg");
    return svg
      ? Array.from(
          svg.querySelectorAll<SVGGraphicsElement>(
            ":is(path, rect, circle, ellipse, line, polyline, polygon)",
          ),
        )
      : [];
  };
  const syncLayerDimensions = (layerNumber) => {
    const element = getGraphics()[layerNumber - 1];
    if (!element) return;
    const edit = assetLayerEdits.get(asset.id)?.get(layerNumber);
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
    layersController.syncDimensionInputs(layerNumber, {
      x: box.left + (edit?.offsetX ?? 0),
      y: box.top + (edit?.offsetY ?? 0),
      width: box.right - box.left,
      height: box.bottom - box.top,
      rx: element.getAttribute("rx") || "",
    });
  };
  const isTypingTarget = (element) => {
    if (!element) return false;
    if (element.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName);
  };

  const canvasHandlesController = createCanvasHandles({
    handles,
    previewContainer,
    getGraphics,
    layersController,
  });

  const shapeEditingController = createShapeEditing({
    get shapeEditLayerNumber() {
      return shapeEditLayerNumber;
    },
    set shapeEditLayerNumber(value) {
      shapeEditLayerNumber = value;
    },
    getGraphics,
    asset,
    points,
    previewContainer,
    gridOverlay,
    get gridVisible() {
      return gridVisible;
    },
    root,
    get gridSize() {
      return gridSize;
    },
    get gridEnabled() {
      return gridEnabled;
    },
    onLayerEdited,
    layersController,
    shapeModeBanner,
    get pointDragState() {
      return pointDragState;
    },
    set pointDragState(value) {
      pointDragState = value;
    },
    updateHandles: canvasHandlesController.updateHandles,
    handles,
  });

  const canvasTooltipController = createCanvasTooltip({
    get shapeEditLayerNumber() {
      return shapeEditLayerNumber;
    },
    exitShapeEditMode: shapeEditingController.exitShapeEditMode,
    handles,
    updatePointHandles: shapeEditingController.updatePointHandles,
    updateGridOverlay: shapeEditingController.updateGridOverlay,
    updateShapeModeBanner: shapeEditingController.updateShapeModeBanner,
    updateHandles: canvasHandlesController.updateHandles,
    tooltip,
    getGraphics,
    asset,
    previewContainer,
  });

  const moveSelectedLayers = (layerNumbers, offsetsByLayer) => {
    for (const layerNumber of layerNumbers) {
      const { offsetX, offsetY } = offsetsByLayer.get(layerNumber);
      updateAssetLayerEdits(asset.id, layerNumber, { offsetX, offsetY });
    }
    applyAssetLayerEdits(root.querySelector("svg"), asset.id);
    for (const layerNumber of layerNumbers) syncLayerDimensions(layerNumber);
    canvasTooltipController.updateTooltip(layersController.getSelectedLayer());
    onLayerEdited?.();
  };

  const onKeydown = (event) => {
    if (event.key === "Escape" && shapeEditLayerNumber !== null) {
      event.preventDefault();
      shapeEditingController.exitShapeEditMode();
      return;
    }
    const layerNumber = layersController.getSelectedLayer();
    if (layerNumber === null || layerNumber === undefined || isTypingTarget(document.activeElement))
      return;
    const deltas = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const multiSelected = layersController.getMultiSelection?.() || [];
    const layerNumbers = multiSelected.length > 1 ? multiSelected : [layerNumber];
    const offsetsByLayer = new Map();
    for (const number of layerNumbers) {
      const existing = assetLayerEdits.get(asset.id)?.get(number);
      offsetsByLayer.set(number, {
        offsetX: (existing?.offsetX || 0) + delta[0] * step,
        offsetY: (existing?.offsetY || 0) + delta[1] * step,
      });
    }
    moveSelectedLayers(layerNumbers, offsetsByLayer);
  };

  const onPointerOver = (event) => {
    const idx = getGraphics().indexOf(event.target);
    if (idx === -1) return;
    layersController.setHoveredLayer(idx + 1);
  };
  const onPointerOut = (event) => {
    const idx = getGraphics().indexOf(event.target);
    if (idx === -1) return;
    layersController.clearHoveredLayer(idx + 1);
  };

  const alignmentGuidesController = createAlignmentGuides({
    root,
    guides,
    previewContainer,
    getGraphics,
  });

  let dragState: CanvasBindings["dragState"] = null;
  let resizeState: CanvasBindings["resizeState"] = null;
  let groupResizeState: CanvasBindings["groupResizeState"] = null;
  let rotateState: CanvasBindings["rotateState"] = null;
  let pendingSelectInfo = null;
  // Shape edit mode: when set, `points`/`d` vertex handles replace the
  // bounding-box handles for a single polygon/polyline layer.
  let shapeEditLayerNumber = null;
  let pointDragState: CanvasBindings["pointDragState"] = null;
  // Grid visibility and snapping are independent canvas controls.
  let gridVisible = false;
  let gridEnabled = false;
  let gridSize = 8;

  // Captures a selected element's current box in two related coordinate
  // frames: `base` is the pre-offset frame that per-element `resize` edits
  // are stored in (same frame as the element's own untransformed getBBox()),
  // and `adjusted` additionally applies the element's offsetX/offsetY so it
  // lines up with every other selected element's box for union/proportional
  // math. Elements aren't nested under any ambient transform here, so plain
  // numeric addition is enough - no matrix math required.
  const resizeGesturesController = createResizeGestures({
    getGraphics,
    asset,
    get groupResizeState() {
      return groupResizeState;
    },
    set groupResizeState(value) {
      groupResizeState = value;
    },
    getUnitsPerPixel: alignmentGuidesController.getUnitsPerPixel,
    layersController,
    get rotateState() {
      return rotateState;
    },
    set rotateState(value) {
      rotateState = value;
    },
    get resizeState() {
      return resizeState;
    },
    set resizeState(value) {
      resizeState = value;
    },
  });

  const onPointerDown = (event) => {
    const graphics = getGraphics();
    const idx = graphics.indexOf(event.target);
    if (idx === -1) {
      // Clicked off the artboard's drawn elements (background/empty canvas area) — deselect.
      const selectedLayerNumber = layersController.getSelectedLayer();
      if (selectedLayerNumber !== null && selectedLayerNumber !== undefined) {
        layersController.selectLayer(selectedLayerNumber);
      }
      return;
    }
    const layerNumber = idx + 1;
    if (event.shiftKey) {
      // Shift-click toggles this element in/out of the multi-selection
      // without starting a drag, so a chain of shift-clicks just builds up
      // the selection rather than moving the last-clicked element.
      event.preventDefault();
      layersController.selectLayer(layerNumber, { additive: true });
      return;
    }
    const selectedLayerNumber = layersController.getSelectedLayer();
    const multiSelected = layersController.getMultiSelection?.() || [];
    const isGroupMember = multiSelected.length > 1 && multiSelected.includes(layerNumber);
    if (layerNumber === selectedLayerNumber || isGroupMember) {
      const { x: scaleX, y: scaleY } = alignmentGuidesController.getUnitsPerPixel();
      const layerNumbers = isGroupMember ? multiSelected : [layerNumber];
      const bases = new Map();
      for (const number of layerNumbers) {
        const existing = assetLayerEdits.get(asset.id)?.get(number);
        bases.set(number, { offsetX: existing?.offsetX || 0, offsetY: existing?.offsetY || 0 });
      }
      dragState = {
        layerNumbers,
        primaryLayerNumber: layerNumber,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        bases,
        scaleX,
        scaleY,
        moved: false,
      };
      event.target.setPointerCapture?.(event.pointerId);
    } else {
      pendingSelectInfo = {
        layerNumber,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
    }
    event.preventDefault();
  };
  const pointerMovementController = createPointerMovement({
    get rotateState() {
      return rotateState;
    },
    asset,
    root,
    updateTooltip: canvasTooltipController.updateTooltip,
    onLayerEdited,
    get groupResizeState() {
      return groupResizeState;
    },
    syncLayerDimensions,
    updateHandles: canvasHandlesController.updateHandles,
    layersController,
    get resizeState() {
      return resizeState;
    },
    get gridEnabled() {
      return gridEnabled;
    },
    snapToGrid: shapeEditingController.snapToGrid,
    clearGuides: alignmentGuidesController.clearGuides,
    getGraphics,
    getAlignmentTargets: alignmentGuidesController.getAlignmentTargets,
    getElementEdges: alignmentGuidesController.getElementEdges,
    findAxisSnap: alignmentGuidesController.findAxisSnap,
    showGuide: alignmentGuidesController.showGuide,
    get dragState() {
      return dragState;
    },
  });

  const onPointerUp = (event) => {
    if (resizeState && event.pointerId === resizeState.pointerId) {
      alignmentGuidesController.clearGuides();
    }
    if (dragState && event.pointerId === dragState.pointerId) {
      alignmentGuidesController.clearGuides();
    }
    if (rotateState && event.pointerId === rotateState.pointerId) {
      rotateState = null;
      return;
    }
    if (groupResizeState && event.pointerId === groupResizeState.pointerId) {
      groupResizeState = null;
      return;
    }
    if (resizeState && event.pointerId === resizeState.pointerId) {
      resizeState = null;
      return;
    }
    if (dragState && event.pointerId === dragState.pointerId) {
      const { primaryLayerNumber, moved } = dragState;
      dragState = null;
      if (!moved) layersController.selectLayer(primaryLayerNumber);
      return;
    }
    if (pendingSelectInfo && event.pointerId === pendingSelectInfo.pointerId) {
      const { layerNumber, startX, startY } = pendingSelectInfo;
      pendingSelectInfo = null;
      if (Math.hypot(event.clientX - startX, event.clientY - startY) < 3) {
        layersController.selectLayer(layerNumber);
      }
    }
  };
  const onWindowResize = () => {
    const layerNumber = layersController.getSelectedLayer();
    if (layerNumber !== null && layerNumber !== undefined)
      canvasTooltipController.updateTooltip(layerNumber);
  };

  window.addEventListener("keydown", onKeydown);
  previewContainer.addEventListener("pointerdown", onPointerDown);
  handles?.addEventListener("pointerdown", resizeGesturesController.onHandlePointerDown);
  points?.addEventListener("pointerdown", shapeEditingController.onPointPointerDown);
  root.addEventListener("dblclick", shapeEditingController.onDoubleClick);
  root.addEventListener("pointerover", onPointerOver);
  root.addEventListener("pointerout", onPointerOut);
  window.addEventListener("pointermove", pointerMovementController.onPointerMove);
  window.addEventListener("pointermove", shapeEditingController.onPointPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointerup", shapeEditingController.onPointPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("pointercancel", shapeEditingController.onPointPointerUp);
  window.addEventListener("resize", onWindowResize);
  const onGridVisibilityToggle = () => {
    gridVisible = !gridVisible;
    gridVisibilityToggle?.setAttribute("aria-pressed", String(gridVisible));
    if (gridVisibilityToggle)
      gridVisibilityToggle.textContent = gridVisible ? "Hide grid" : "Show grid";
    shapeEditingController.updateGridOverlay();
  };
  const onGridSnapToggle = () => {
    gridEnabled = !gridEnabled;
    gridSnapToggle?.setAttribute("aria-pressed", String(gridEnabled));
    shapeEditingController.updateGridOverlay();
  };
  const onGridSizeInput = () => {
    const next = Number(gridSizeInput?.value);
    if (!Number.isFinite(next) || next <= 0) return;
    gridSize = next;
    shapeEditingController.updateGridOverlay();
  };
  gridVisibilityToggle?.addEventListener("click", onGridVisibilityToggle);
  gridSnapToggle?.addEventListener("click", onGridSnapToggle);
  gridSizeInput?.addEventListener("input", onGridSizeInput);

  return {
    updateTooltip: canvasTooltipController.updateTooltip,
    cleanup: () => {
      shapeEditingController.exitShapeEditMode();
      window.removeEventListener("keydown", onKeydown);
      previewContainer.removeEventListener("pointerdown", onPointerDown);
      handles?.removeEventListener("pointerdown", resizeGesturesController.onHandlePointerDown);
      points?.removeEventListener("pointerdown", shapeEditingController.onPointPointerDown);
      root.removeEventListener("dblclick", shapeEditingController.onDoubleClick);
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("pointermove", pointerMovementController.onPointerMove);
      window.removeEventListener("pointermove", shapeEditingController.onPointPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerup", shapeEditingController.onPointPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointercancel", shapeEditingController.onPointPointerUp);
      window.removeEventListener("resize", onWindowResize);
      gridVisibilityToggle?.removeEventListener("click", onGridVisibilityToggle);
      gridSnapToggle?.removeEventListener("click", onGridSnapToggle);
      gridSizeInput?.removeEventListener("input", onGridSizeInput);
      if (tooltip) tooltip.hidden = true;
      if (handles) handles.hidden = true;
      if (points) {
        points.hidden = true;
        points.replaceChildren();
      }
      if (shapeModeBanner) shapeModeBanner.hidden = true;
      if (gridOverlay) gridOverlay.hidden = true;
      alignmentGuidesController.clearGuides();
    },
  };
}

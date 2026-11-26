import type { CanvasBindings } from "../controller-types.js";

export function createAlignmentGuides(
  context: Pick<CanvasBindings, "root" | "guides" | "previewContainer" | "getGraphics">,
) {
  const getUnitsPerPixel = () => {
    const svg = context.root.querySelector("svg");
    const viewBox = svg?.viewBox?.baseVal;
    const bounds = svg?.getBoundingClientRect();
    return {
      x: viewBox && bounds?.width ? viewBox.width / bounds.width : 1,
      y: viewBox && bounds?.height ? viewBox.height / bounds.height : 1,
    };
  };

  // Alignment guides: while dragging/resizing, the moving element's screen
  // edges/centers are compared against every other element's edges/centers
  // (plus the artboard/svg bounds) and snapped when within GUIDE_SNAP_PX,
  // with a cyan guide line drawn at the matched position. Comparisons and
  // snapping happen in screen space (getBoundingClientRect, relative to
  // previewContainer) since that's the space users visually align in; the
  // resulting pixel correction is converted back to local SVG units via
  // unitsPerPixel before being written into the edit.
  const GUIDE_SNAP_PX = 6;

  const clearGuides = () => {
    if (context.guides) {
      context.guides.replaceChildren();
      context.guides.hidden = true;
    }
  };

  const showGuide = (axis, screenPos) => {
    if (!context.guides) return;
    context.guides.hidden = false;
    const line = document.createElement("div");
    line.className = `asset-alignment-guide asset-alignment-guide--${axis}`;
    if (axis === "v") line.style.left = `${screenPos}px`;
    else line.style.top = `${screenPos}px`;
    context.guides.appendChild(line);
  };

  // Returns edge/center rects (relative to previewContainer) for the
  // artboard SVG and every graphic other than the ones in `excludeIndices`
  // (accepts a single index or an array/Set of indices, so group moves can
  // exclude every selected element rather than just one).
  const getAlignmentTargets = (excludeIndices) => {
    const excluded = new Set(
      Array.isArray(excludeIndices) || excludeIndices instanceof Set
        ? excludeIndices
        : [excludeIndices],
    );
    const containerRect = context.previewContainer.getBoundingClientRect();
    const toEdges = (rect) => ({
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
      centerX: (rect.left + rect.right) / 2 - containerRect.left,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      centerY: (rect.top + rect.bottom) / 2 - containerRect.top,
    });
    const targets = [];
    const svg = context.root.querySelector("svg");
    if (svg) targets.push(toEdges(svg.getBoundingClientRect()));
    context.getGraphics().forEach((el, idx) => {
      if (excluded.has(idx)) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      targets.push(toEdges(rect));
    });
    return targets;
  };

  // Among `keys` (edge/center property names to test on the moving element),
  // finds the target whose same-named property is closest to the moving
  // element's value, within GUIDE_SNAP_PX. Same-type comparison only (left
  // aligns to left, center to center, etc.) keeps snap behavior predictable.
  const findAxisSnap = (activeEdges, keys, targets) => {
    let best = null;
    for (const key of keys) {
      const activeVal = activeEdges[key];
      for (const target of targets) {
        const delta = target[key] - activeVal;
        if (Math.abs(delta) <= GUIDE_SNAP_PX && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, screenPos: target[key], key };
        }
      }
    }
    return best;
  };

  const getElementEdges = (element) => {
    const containerRect = context.previewContainer.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left - containerRect.left,
      right: rect.right - containerRect.left,
      centerX: (rect.left + rect.right) / 2 - containerRect.left,
      top: rect.top - containerRect.top,
      bottom: rect.bottom - containerRect.top,
      centerY: (rect.top + rect.bottom) / 2 - containerRect.top,
    };
  };
  return {
    getUnitsPerPixel,
    clearGuides,
    getAlignmentTargets,
    getElementEdges,
    findAxisSnap,
    showGuide,
  };
}

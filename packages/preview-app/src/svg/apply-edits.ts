import {
  assetAccessibilityEdits,
  assetLayerEdits,
  assetModified,
  assetGroupEdits,
} from "./editor-state.js";
import { SVG_NAMESPACE } from "./geometry.js";
import type { LayerEdit } from "../types.js";

export function applyAssetAccessibility(svg, assetId) {
  if (!svg) return;
  const accessibility = assetAccessibilityEdits.get(assetId);
  if (!accessibility) return;
  svg.removeAttribute("aria-labelledby");
  svg.querySelector("title")?.remove();
  svg.querySelector("desc")?.remove();
  const labelledBy = [];
  if (accessibility.title) {
    const title = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "title");
    title.id = `asset-${assetId}-title`;
    title.textContent = accessibility.title;
    svg.prepend(title);
    labelledBy.push(title.id);
  }
  if (accessibility.description) {
    const description = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "desc");
    description.id = `asset-${assetId}-description`;
    description.textContent = accessibility.description;
    svg.insertBefore(description, svg.firstChild?.nextSibling || null);
    labelledBy.push(description.id);
  }
  if (labelledBy.length) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-labelledby", labelledBy.join(" "));
  } else {
    svg.removeAttribute("role");
  }
}

export function updateAssetLayerEdits(
  assetId: string,
  layerNumber: number,
  updates: Partial<LayerEdit>,
) {
  if (!assetLayerEdits.has(assetId)) assetLayerEdits.set(assetId, new Map());
  const edits = assetLayerEdits.get(assetId);
  const existing = edits.get(layerNumber) || { paints: {}, attrs: {} };
  edits.set(layerNumber, {
    ...existing,
    ...updates,
    paints: { ...existing.paints, ...updates.paints },
    attrs: { ...existing.attrs, ...updates.attrs },
  });
  assetModified.add(assetId);
}

export function applyAssetLayerEdits(svg: SVGSVGElement | null, assetId: string) {
  if (!svg) return;
  const edits = assetLayerEdits.get(assetId);
  if (!edits) return;
  const graphics = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>(
      ":is(path, rect, circle, ellipse, line, polyline, polygon)",
    ),
  );
  for (const [layerNumber, edit] of edits) {
    const element = graphics[layerNumber - 1];
    if (!element) continue;
    for (const [property, value] of Object.entries(edit.paints)) {
      element.setAttribute(property, value);
    }
    for (const [property, value] of Object.entries(edit.attrs || {})) {
      element.setAttribute(property, value);
    }
    if (edit.opacity !== undefined) element.setAttribute("opacity", String(edit.opacity));
    if (
      edit.offsetX !== undefined ||
      edit.offsetY !== undefined ||
      edit.resize ||
      edit.rotation !== undefined
    ) {
      const originalTransform =
        element.dataset.originalTransform ?? element.getAttribute("transform") ?? "";
      element.dataset.originalTransform = originalTransform;
      const parts = [originalTransform];
      if (edit.rotation !== undefined) {
        // Rotate around the element's current visual center - after resize
        // and move (offset) have been applied, but before any ambient
        // original/group transform - so it spins the shape in place
        // regardless of how it's been moved or resized.
        let centerX, centerY;
        if (edit.resize) {
          centerX = (edit.resize.left + edit.resize.right) / 2;
          centerY = (edit.resize.top + edit.resize.bottom) / 2;
        } else {
          let bbox = null;
          try {
            bbox = element.getBBox();
          } catch {
            /* not renderable yet */
          }
          centerX = bbox ? bbox.x + bbox.width / 2 : 0;
          centerY = bbox ? bbox.y + bbox.height / 2 : 0;
        }
        const cx = centerX + (edit.offsetX || 0);
        const cy = centerY + (edit.offsetY || 0);
        parts.push(`rotate(${edit.rotation} ${cx} ${cy})`);
      }
      if (edit.offsetX !== undefined || edit.offsetY !== undefined) {
        parts.push(`translate(${edit.offsetX || 0} ${edit.offsetY || 0})`);
      }
      if (edit.resize) {
        // Maps the element's native (untransformed) bounding box edges
        // (nativeLeft/Top/Right/Bottom, captured once on the first resize) onto
        // the stored current edges (left/top/right/bottom). Storing absolute
        // native-space edges - rather than an anchor point plus a scale factor -
        // means each edge's screen position is derived independently every time,
        // so dragging a different handle in a later resize never disturbs edges
        // that aren't being dragged, even if a previous resize used a different
        // anchor. Applied innermost (rightmost) so it acts on the element's
        // native geometry before the offset/original transform.
        const { nativeLeft, nativeTop, nativeWidth, nativeHeight, left, top, right, bottom } =
          edit.resize;
        const scaleX = nativeWidth > 0 ? (right - left) / nativeWidth : 1;
        const scaleY = nativeHeight > 0 ? (bottom - top) / nativeHeight : 1;
        const translateX = left - scaleX * nativeLeft;
        const translateY = top - scaleY * nativeTop;
        parts.push(`translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`);
      }
      element.setAttribute("transform", parts.join(" ").trim());
    }
  }
  const groupEdits = assetGroupEdits.get(assetId);
  if (groupEdits) {
    const groups = Array.from(svg.querySelectorAll("g"));
    groups.forEach((group, index) => {
      const edit = groupEdits.get(index + 1);
      if (edit?.opacity !== undefined) group.setAttribute("opacity", String(edit.opacity));
    });
  }
}

import { SVG_PAINT_PROPERTIES, normalizeSvgColor, loadAssetSvgData } from "./analysis.js";
import { assetViewBoxEdits, assetSourceSizeEdits } from "./editor-state.js";
import { applyAssetAccessibility, applyAssetLayerEdits } from "./apply-edits.js";

export function elementUsesSvgColor(element, color) {
  return SVG_PAINT_PROPERTIES.some(
    (property) =>
      normalizeSvgColor(
        element.getAttribute(property) || element.style?.getPropertyValue(property),
      ) === color,
  );
}

export function setPrimarySvgColorHighlight(root, color, highlighted) {
  const svg = root.querySelector("svg");
  if (!svg) return [];
  const graphics = Array.from(
    svg.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon"),
  );
  graphics.forEach((element, index) => {
    element.dataset.paintLayer = String(index + 1);
  });

  if (!highlighted) {
    for (const element of graphics) {
      element.classList.remove("is-color-highlighted", "is-color-muted");
    }
    return [];
  }

  const selected = graphics.filter((element) => {
    let candidate = element;
    while (candidate && candidate !== svg) {
      if (elementUsesSvgColor(candidate, color)) return true;
      candidate = candidate.parentElement;
    }
    return false;
  });
  const selectedSet = new Set(selected);
  for (const element of graphics) {
    element.classList.toggle("is-color-highlighted", selectedSet.has(element));
    element.classList.toggle("is-color-muted", !selectedSet.has(element));
  }
  return selected;
}

export function setPrimarySvgLayerHighlight(root, layerNumber, highlighted) {
  const graphics = Array.from(
    root.querySelectorAll("svg :is(path, rect, circle, ellipse, line, polyline, polygon)"),
  );
  if (!highlighted) {
    for (const element of graphics) {
      element.classList.remove("is-color-highlighted");
    }
    return;
  }

  // Only outline the hovered/selected element - leave every other element's
  // opacity untouched so the rest of the artwork stays visible at full
  // strength instead of dimming while browsing layers.
  const selected = graphics[layerNumber - 1];
  for (const element of graphics) {
    element.classList.toggle("is-color-highlighted", element === selected);
  }
}

export function setPrimarySvgMultiSelectHighlight(root, layerNumbers) {
  const graphics = Array.from(
    root.querySelectorAll("svg :is(path, rect, circle, ellipse, line, polyline, polygon)"),
  );
  const selected = new Set(layerNumbers);
  const showAll = selected.size > 1;
  graphics.forEach((element, idx) => {
    element.classList.toggle("is-multi-selected", showAll && selected.has(idx + 1));
  });
}

export function describeSvgRegions(elements) {
  const labels = {
    rect: "rectangle",
    ellipse: "ellipse",
    polyline: "polyline",
    polygon: "polygon",
  };
  const counts = new Map();
  for (const element of elements) {
    const name = labels[element.localName] || element.localName;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts, ([name, count]) => `${count} ${name}${count === 1 ? "" : "s"}`).join(
    ", ",
  );
}

export function describeSvgLayers(elements) {
  const layers = elements
    .map((element) => Number(element.dataset.paintLayer))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const ranges = [];
  for (const layer of layers) {
    const current = ranges.at(-1);
    if (current && layer === current[1] + 1) {
      current[1] = layer;
    } else {
      ranges.push([layer, layer]);
    }
  }
  const summary = ranges
    .map(([start, end]) => (start === end ? String(start) : `${start}-${end}`))
    .join(", ");
  return `${layers.length === 1 ? "element" : "elements"} ${summary}`;
}

export function previewSizeLabel(size) {
  return size === "fit" ? "Fit width" : `${size}px`;
}

export function setAssetPrimarySvgSize(root, asset, size) {
  const cssSize = size === "fit" ? "100%" : `${size}px`;
  root.style.setProperty("--asset-preview-size", cssSize);
  root.setAttribute("aria-label", `${asset.label} at ${previewSizeLabel(size)}`);
}

export function renderAssetPrimarySvg(root, asset, size = "fit") {
  root.replaceChildren();
  root.dataset.assetId = asset.id;
  setAssetPrimarySvgSize(root, asset, size);

  loadAssetSvgData(asset.source)
    .then((data) => {
      if (!root.isConnected || root.dataset.assetId !== asset.id) return;
      const svg = document.importNode(data.svg, true);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      const viewBox = assetViewBoxEdits.get(asset.id);
      if (viewBox) svg.setAttribute("viewBox", viewBox.join(" "));
      const sourceSize = assetSourceSizeEdits.get(asset.id);
      if (sourceSize) {
        svg.setAttribute("width", String(sourceSize.width));
        svg.setAttribute("height", String(sourceSize.height));
      }
      applyAssetAccessibility(svg, asset.id);
      applyAssetLayerEdits(svg, asset.id);
      root.replaceChildren(svg);
    })
    .catch(() => {
      if (root.isConnected && root.dataset.assetId === asset.id)
        root.textContent = "Preview unavailable";
    });
}

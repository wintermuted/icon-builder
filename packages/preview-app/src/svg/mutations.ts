import { assetLayerEdits, assetModified, assetLayerSelections } from "./editor-state.js";
import {
  GRAPHIC_ELEMENT_SELECTOR,
  computePaintLayers,
  describeGraphicElement,
  loadAssetSvgData,
} from "./analysis.js";
import {
  SVG_NAMESPACE,
  invertSvgMatrix,
  accumulatedSvgMatrix,
  multiplySvgMatrices,
  svgMatrixToString,
  createDefaultShapeElement,
} from "./geometry.js";

export function remapAssetLayerEdits(assetId, remap) {
  const edits = assetLayerEdits.get(assetId);
  if (!edits) return;
  const next = new Map();
  for (const [oldNumber, edit] of edits) {
    const newNumber = remap.get(oldNumber);
    if (newNumber) next.set(newNumber, edit);
  }
  assetLayerEdits.set(assetId, next);
  assetModified.add(assetId);
}

export function remapAssetLayerSelection(assetId, remap) {
  const selection = assetLayerSelections.get(assetId);
  if (!selection) return;
  const next = new Set();
  for (const oldNumber of selection) {
    const newNumber = remap.get(oldNumber);
    if (newNumber) next.add(newNumber);
  }
  assetLayerSelections.set(assetId, next);
}

export function refreshAssetSvgMetrics(data, svg) {
  const graphics = Array.from(svg.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
  data.paintLayers = computePaintLayers(svg);
  data.paintLayerCount = data.paintLayers.length;
  data.topmostLayer = graphics.length ? describeGraphicElement(graphics.at(-1), svg) : "None";
  data.maxGroupDepth = Math.max(0, ...data.paintLayers.map((layer) => layer.groupDepth));
  data.groupCount = svg.querySelectorAll("g").length;
}

export function reorderAssetLayer(asset, fromNumber, toNumber, onComplete) {
  if (fromNumber === toNumber) return;
  loadAssetSvgData(asset.source).then((data) => {
    const svg = data.svg;
    const graphics = Array.from(svg.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
    const moving = graphics[fromNumber - 1];
    const target = graphics[toNumber - 1];
    if (!moving || !target || moving === target) return;
    const oldNumberByElement = new Map(graphics.map((element, index) => [element, index + 1]));
    if (fromNumber < toNumber) target.after(moving);
    else target.before(moving);
    const newGraphics = Array.from(svg.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
    const remap = new Map();
    newGraphics.forEach((element, index) => {
      const oldNumber = oldNumberByElement.get(element);
      if (oldNumber) remap.set(oldNumber, index + 1);
    });
    remapAssetLayerEdits(asset.id, remap);
    remapAssetLayerSelection(asset.id, remap);
    refreshAssetSvgMetrics(data, svg);
    assetModified.add(asset.id);
    onComplete?.();
  });
}

export function combineAssetLayers(asset, layerNumbers, onComplete) {
  const numbers = [...new Set(layerNumbers)]
    .filter((number) => Number.isInteger(number) && number > 0)
    .sort((left, right) => left - right);
  if (numbers.length < 2) return;

  loadAssetSvgData(asset.source).then((data) => {
    const svg = data.svg;
    const graphics = Array.from(svg.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
    const selected = numbers.map((number) => graphics[number - 1]).filter(Boolean);
    if (selected.length < 2) return;

    const oldNumberByElement = new Map(graphics.map((element, index) => [element, index + 1]));
    const group = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "g");
    selected.at(-1).after(group);

    // Elements pulled out of transformed ancestors keep their rendered position.
    const inverseDestination = invertSvgMatrix(accumulatedSvgMatrix(group.parentElement, svg));
    for (const element of selected) {
      const effective = accumulatedSvgMatrix(element, svg);
      const preserved = inverseDestination
        ? multiplySvgMatrices(inverseDestination, effective)
        : effective;
      group.appendChild(element);
      const transform = svgMatrixToString(preserved);
      if (transform) element.setAttribute("transform", transform);
      else element.removeAttribute("transform");
    }

    for (const candidate of Array.from(svg.querySelectorAll("g"))) {
      if (candidate !== group && !candidate.children.length && !candidate.getAttribute("id"))
        candidate.remove();
    }

    const newGraphics = Array.from(svg.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
    const remap = new Map();
    newGraphics.forEach((element, index) => {
      const oldNumber = oldNumberByElement.get(element);
      if (oldNumber) remap.set(oldNumber, index + 1);
    });
    remapAssetLayerEdits(asset.id, remap);
    remapAssetLayerSelection(asset.id, remap);
    refreshAssetSvgMetrics(data, svg);
    onComplete?.(numbers.map((number) => remap.get(number)).filter(Boolean));
  });
}

export function createAssetElement(asset, shape, container, onComplete) {
  loadAssetSvgData(asset.source).then((data) => {
    const svg = data.svg;
    const target = container && svg.contains(container) ? container : svg;
    const graphics = Array.from(svg.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
    const oldNumberByElement = new Map(graphics.map((element, index) => [element, index + 1]));
    const element = createDefaultShapeElement(svg, shape);
    target.appendChild(element);

    const newGraphics = Array.from(svg.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
    const remap = new Map();
    let newNumber;
    newGraphics.forEach((graphic, index) => {
      const oldNumber = oldNumberByElement.get(graphic);
      if (oldNumber) remap.set(oldNumber, index + 1);
      if (graphic === element) newNumber = index + 1;
    });
    remapAssetLayerEdits(asset.id, remap);
    remapAssetLayerSelection(asset.id, remap);
    refreshAssetSvgMetrics(data, svg);
    onComplete?.(newNumber);
  });
}

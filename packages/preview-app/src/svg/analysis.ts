import { SVG_ELEMENT_GEOMETRY_ATTRIBUTES } from "./geometry.js";
import { assetSvgDataCache } from "./editor-state.js";
import type { ElementTree, PaintLayer, SvgData } from "../types.js";

export const SVG_PAINT_PROPERTIES = [
  "fill",
  "stroke",
  "stop-color",
  "flood-color",
  "lighting-color",
  "color",
];

export const GRAPHIC_ELEMENT_SELECTOR = "path, rect, circle, ellipse, line, polyline, polygon";

export function enumerateElementAttributes(elementName, attributes) {
  const entries = [...attributes];
  const existing = new Set(entries.map(([name]) => name));
  for (const name of SVG_ELEMENT_GEOMETRY_ATTRIBUTES.get(elementName) || []) {
    if (!existing.has(name)) entries.push([name, ""]);
  }
  if (!existing.has("stroke")) entries.push(["stroke", "none"]);
  const styleOrder = new Map([
    ["fill", 0],
    ["opacity", 1],
    ["stroke", 2],
  ]);
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const leftOrder = styleOrder.get(left.entry[0]) ?? 3;
      const rightOrder = styleOrder.get(right.entry[0]) ?? 3;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ entry }) => entry);
}

export function normalizeSvgColor(value) {
  const color = String(value || "").trim();
  const hex = color.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (!hex) return "";
  const expanded =
    hex.length <= 4 ? [...hex].map((character) => character.repeat(2)).join("") : hex;
  return `#${expanded.toUpperCase()}`;
}

export function resolveSvgPaint(element, property, svg) {
  let candidate = element;
  while (candidate) {
    const value = String(
      candidate.getAttribute(property) || candidate.style?.getPropertyValue(property) || "",
    ).trim();
    if (value) return normalizeSvgColor(value) || value;
    if (candidate === svg) break;
    candidate = candidate.parentElement;
  }
  return property === "fill" ? "#000000" : "none";
}

export function graphicElementPaints(element, svg) {
  return ["fill", "stroke"]
    .map((property) => [property, resolveSvgPaint(element, property, svg)])
    .filter(([, value]) => value !== "none");
}

export function describeGraphicElement(element, svg) {
  const paints = graphicElementPaints(element, svg).map(
    ([property, value]) => `${property} ${value}`,
  );
  return `${element.localName}${paints.length ? ` · ${paints.join(" · ")}` : ""}`;
}

export function computePaintLayers(svg: SVGSVGElement): PaintLayer[] {
  const graphicElements = Array.from(
    svg.querySelectorAll<SVGGraphicsElement>(GRAPHIC_ELEMENT_SELECTOR),
  );
  return graphicElements.map((element, index) => {
    let depth = 0;
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== svg) {
      if (ancestor.localName === "g") depth += 1;
      ancestor = ancestor.parentElement;
    }
    return {
      number: index + 1,
      element: element.localName,
      elementNode: element,
      id: element.getAttribute("id") || "",
      paints: graphicElementPaints(element, svg),
      opacity: element.getAttribute("opacity") || "",
      attributes: Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]),
      groupDepth: depth,
    };
  });
}

export function buildElementTree(container: Element, counter = { value: 0 }): ElementTree[] {
  const nodes: ElementTree[] = [];
  for (const child of container.children) {
    if (child.matches(GRAPHIC_ELEMENT_SELECTOR)) {
      counter.value += 1;
      nodes.push({ type: "element", number: counter.value });
    } else if (child instanceof SVGGElement) {
      nodes.push({ type: "group", element: child, children: buildElementTree(child, counter) });
    } else {
      // Non-<g> containers (defs, clipPath, symbol, ...) aren't a visual group,
      // but their descendants still count toward numbering, so flatten them in.
      nodes.push(...buildElementTree(child, counter));
    }
  }
  return nodes;
}

export function collectElementNumbers(node) {
  if (node.type === "element") return [node.number];
  return node.children.flatMap(collectElementNumbers);
}

export function describeSvgEffects(documentRoot) {
  const effects = [
    ["gradient", documentRoot.querySelectorAll("linearGradient, radialGradient").length],
    ["clip path", documentRoot.querySelectorAll("clipPath").length],
    ["mask", documentRoot.querySelectorAll("mask").length],
    ["filter", documentRoot.querySelectorAll("filter").length],
  ];
  const used = effects.filter(([, count]) => count > 0);
  return used.length
    ? used.map(([label, count]) => `${count} ${label}${count === 1 ? "" : "s"}`).join(", ")
    : "None";
}

export function loadAssetSvgData(source: string): Promise<SvgData> {
  if (!assetSvgDataCache.has(source)) {
    assetSvgDataCache.set(
      source,
      (async () => {
        const response = await fetch(`../${source}`);
        if (!response.ok) throw new Error(`Failed to load ${source}`);
        const sourceText = await response.text();
        const documentRoot = new DOMParser().parseFromString(sourceText, "image/svg+xml");
        if (documentRoot.querySelector("parsererror")) throw new Error(`Failed to parse ${source}`);

        const colors = [];
        for (const element of documentRoot.querySelectorAll("*")) {
          for (const property of SVG_PAINT_PROPERTIES) {
            const color = normalizeSvgColor(
              element.getAttribute(property) || element.style?.getPropertyValue(property),
            );
            if (color && !colors.includes(color)) colors.push(color);
          }
        }
        const svg = documentRoot.querySelector("svg");
        if (!svg || svg !== documentRoot.documentElement)
          throw new Error(`Failed to parse ${source}`);
        const graphicElements = Array.from(documentRoot.querySelectorAll(GRAPHIC_ELEMENT_SELECTOR));
        const paths = Array.from(documentRoot.querySelectorAll("path"));
        const pathCommands = /[AaCcHhLlMmQqSsTtVvZz]/g;
        const paintLayers = computePaintLayers(svg);
        return {
          colors,
          viewBox: svg.getAttribute("viewBox") || "Not set",
          width: svg.getAttribute("width") || "Not set",
          height: svg.getAttribute("height") || "Not set",
          paintLayers,
          paintLayerCount: paintLayers.length,
          topmostLayer: graphicElements.length
            ? describeGraphicElement(graphicElements.at(-1), svg)
            : "None",
          pathCount: paths.length,
          closedPathCount: paths.filter((path) => /[Zz]/.test(path.getAttribute("d") || "")).length,
          pathSubpathCount: paths.reduce(
            (count, path) => count + ((path.getAttribute("d") || "").match(/[Mm]/g)?.length || 0),
            0,
          ),
          pathCommandCount: paths.reduce(
            (count, path) =>
              count + ((path.getAttribute("d") || "").match(pathCommands)?.length || 0),
            0,
          ),
          groupCount: documentRoot.querySelectorAll("g").length,
          maxGroupDepth: Math.max(0, ...paintLayers.map((layer) => layer.groupDepth)),
          effects: describeSvgEffects(documentRoot),
          byteSize: new TextEncoder().encode(sourceText).length,
          accessibleName: svg.querySelector("title")?.textContent?.trim() || "Not defined",
          description: svg.querySelector("desc")?.textContent?.trim() || "Not defined",
          svg,
        };
      })(),
    );
  }
  return assetSvgDataCache.get(source);
}

export function loadAssetColors(source) {
  return loadAssetSvgData(source).then((data) => data.colors);
}

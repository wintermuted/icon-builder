export const NEW_ELEMENT_SHAPES = [
  { value: "rect", label: "Rectangle", icon: "square" },
  { value: "circle", label: "Circle", icon: "circle" },
  { value: "ellipse", label: "Ellipse", icon: "circle" },
  { value: "line", label: "Line", icon: "minus" },
  { value: "polyline", label: "Polyline", icon: "spline" },
  { value: "polygon", label: "Polygon", icon: "pentagon" },
  { value: "path", label: "Path", icon: "pen-line" },
];

export const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const IDENTITY_MATRIX = [1, 0, 0, 1, 0, 0];

export const SVG_ELEMENT_GEOMETRY_ATTRIBUTES = new Map([
  ["rect", ["x", "y", "width", "height", "rx", "ry"]],
  ["circle", ["cx", "cy", "r"]],
  ["ellipse", ["cx", "cy", "rx", "ry"]],
  ["line", ["x1", "y1", "x2", "y2"]],
  ["polyline", ["points"]],
  ["polygon", ["points"]],
  ["path", ["d"]],
]);

export function multiplySvgMatrices(left, right) {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

export function invertSvgMatrix(matrix) {
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  if (!determinant) return null;
  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ];
}

export function svgTransformToMatrix(name, args) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  if (name === "matrix") return args.length === 6 ? args : IDENTITY_MATRIX;
  if (name === "translate") return [1, 0, 0, 1, args[0] || 0, args[1] || 0];
  if (name === "scale") {
    const scaleX = args[0] ?? 1;
    return [scaleX, 0, 0, args[1] ?? scaleX, 0, 0];
  }
  if (name === "rotate") {
    const angle = toRadians(args[0] || 0);
    const rotation = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
    if (args.length < 3) return rotation;
    return multiplySvgMatrices(multiplySvgMatrices([1, 0, 0, 1, args[1], args[2]], rotation), [
      1,
      0,
      0,
      1,
      -args[1],
      -args[2],
    ]);
  }
  if (name === "skewX") return [1, 0, Math.tan(toRadians(args[0] || 0)), 1, 0, 0];
  if (name === "skewY") return [1, Math.tan(toRadians(args[0] || 0)), 0, 1, 0, 0];
  return IDENTITY_MATRIX;
}

export function parseSvgTransform(value) {
  let matrix = IDENTITY_MATRIX;
  for (const [, name, rawArgs] of String(value || "").matchAll(
    /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g,
  )) {
    const args = rawArgs
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (args.some((argument) => !Number.isFinite(argument))) continue;
    matrix = multiplySvgMatrices(matrix, svgTransformToMatrix(name, args));
  }
  return matrix;
}

export function accumulatedSvgMatrix(element, root) {
  const chain = [];
  let node = element;
  while (node) {
    chain.unshift(node);
    if (node === root) break;
    node = node.parentElement;
  }
  return chain.reduce(
    (matrix, node) =>
      multiplySvgMatrices(matrix, parseSvgTransform(node.getAttribute("transform"))),
    IDENTITY_MATRIX,
  );
}

export function svgMatrixToString(matrix) {
  if (matrix.every((value, index) => Math.abs(value - IDENTITY_MATRIX[index]) < 1e-9)) return "";
  return `matrix(${matrix.map((value) => Number(value.toFixed(6))).join(" ")})`;
}

export function sanitizeSvgId(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  let id = trimmed.replace(/\s+/g, "-").replace(/[^A-Za-z0-9_:.-]/g, "");
  if (!id) return "";
  if (!/^[A-Za-z_]/.test(id)) id = `g-${id}`;
  return id;
}

export function getAssetViewBoxBounds(svg) {
  const baseVal = svg.viewBox?.baseVal;
  if (baseVal && (baseVal.width || baseVal.height)) {
    return { minX: baseVal.x, minY: baseVal.y, width: baseVal.width, height: baseVal.height };
  }
  const width = Number(svg.getAttribute("width")) || 512;
  const height = Number(svg.getAttribute("height")) || 512;
  return { minX: 0, minY: 0, width, height };
}

export function createDefaultShapeElement(svg, shape) {
  const { minX, minY, width, height } = getAssetViewBoxBounds(svg);
  const size = Math.max(1, Math.min(width, height) * 0.2);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  const element = svg.ownerDocument.createElementNS(SVG_NAMESPACE, shape);
  element.setAttribute("fill", shape === "line" ? "none" : "#6366F1");
  if (shape === "rect") {
    element.setAttribute("x", String(centerX - size / 2));
    element.setAttribute("y", String(centerY - size / 2));
    element.setAttribute("width", String(size));
    element.setAttribute("height", String(size));
  } else if (shape === "circle") {
    element.setAttribute("cx", String(centerX));
    element.setAttribute("cy", String(centerY));
    element.setAttribute("r", String(size / 2));
  } else if (shape === "ellipse") {
    element.setAttribute("cx", String(centerX));
    element.setAttribute("cy", String(centerY));
    element.setAttribute("rx", String(size / 2));
    element.setAttribute("ry", String(size / 3));
  } else if (shape === "line") {
    element.setAttribute("x1", String(centerX - size / 2));
    element.setAttribute("y1", String(centerY));
    element.setAttribute("x2", String(centerX + size / 2));
    element.setAttribute("y2", String(centerY));
    element.setAttribute("stroke", "#6366F1");
    element.setAttribute("stroke-width", "2");
  } else if (shape === "polyline" || shape === "polygon") {
    const half = size / 2;
    const points = [
      [centerX, centerY - half],
      [centerX + half, centerY],
      [centerX, centerY + half],
      [centerX - half, centerY],
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(" ");
    element.setAttribute("points", points);
    if (shape === "polyline") {
      element.setAttribute("fill", "none");
      element.setAttribute("stroke", "#6366F1");
      element.setAttribute("stroke-width", "2");
    }
  } else if (shape === "path") {
    const half = size / 2;
    element.setAttribute(
      "d",
      `M ${centerX} ${centerY - half} L ${centerX + half} ${centerY} L ${centerX} ${centerY + half} L ${centerX - half} ${centerY} Z`,
    );
  }
  return element;
}

export function parseSvgViewBox(value) {
  const numbers = String(value || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  return numbers.length === 4 && numbers.every(Number.isFinite) ? numbers : null;
}

export const GEOMETRY_ATTRIBUTES = new Set(["points", "d"]);

export const POINT_EDITABLE_SHAPES = new Set(["polygon", "polyline"]);

export function parseSvgPoints(value) {
  const numbers = String(value || "")
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  const points = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push({ x: numbers[i], y: numbers[i + 1] });
  }
  return points;
}

export function serializeSvgPoints(points) {
  return points
    .map(({ x, y }) => `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`)
    .join(" ");
}

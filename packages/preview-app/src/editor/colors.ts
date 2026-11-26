import { loadAssetColors } from "../svg/analysis.js";

export function renderAssetColorList(root, asset, onHighlight) {
  root.textContent = "Loading...";
  root.dataset.assetId = asset.id;

  loadAssetColors(asset.source)
    .then((colors) => {
      if (!root.isConnected || root.dataset.assetId !== asset.id) return;
      root.textContent = "";
      if (!colors.length) {
        root.textContent = "No explicit colors";
        return;
      }
      for (const color of colors) {
        const item = document.createElement("span");
        item.className = "asset-color";
        item.setAttribute("aria-label", color);
        if (onHighlight) {
          let hovered = false;
          let focused = false;
          const syncHighlight = () => {
            const active = hovered || focused;
            item.classList.toggle("is-active", active);
            onHighlight(color, active);
          };
          item.tabIndex = 0;
          item.addEventListener("mouseenter", () => {
            hovered = true;
            syncHighlight();
          });
          item.addEventListener("mouseleave", () => {
            hovered = false;
            syncHighlight();
          });
          item.addEventListener("focus", () => {
            focused = true;
            syncHighlight();
          });
          item.addEventListener("blur", () => {
            focused = false;
            syncHighlight();
          });
        }
        const swatch = document.createElement("span");
        swatch.className = "asset-color-swatch";
        swatch.style.backgroundColor = color;
        swatch.setAttribute("aria-hidden", "true");
        item.dataset.tooltip = color;
        item.appendChild(swatch);
        root.appendChild(item);
      }
    })
    .catch(() => {
      if (root.isConnected && root.dataset.assetId === asset.id)
        root.textContent = "Colors unavailable";
    });
}

export function renderStaticAssetColorList(root, colors, emptyMessage) {
  root.textContent = "";
  if (!colors.length) {
    if (emptyMessage) root.textContent = emptyMessage;
    return;
  }
  for (const color of colors) {
    const item = document.createElement("span");
    item.className = "asset-color";
    item.setAttribute("aria-label", color);
    item.dataset.tooltip = color;
    const swatch = document.createElement("span");
    swatch.className = "asset-color-swatch";
    swatch.style.backgroundColor = color;
    swatch.setAttribute("aria-hidden", "true");
    item.appendChild(swatch);
    root.appendChild(item);
  }
}

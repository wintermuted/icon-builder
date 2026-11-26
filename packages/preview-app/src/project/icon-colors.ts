import { appState } from "../app-state.js";
import { loadAssetColors } from "../svg/analysis.js";
import { projectForAsset, projectRouteHref } from "./model.js";

export function collectColorUsageAcrossAssets() {
  return Promise.all(
    appState.assetData.map((asset) =>
      loadAssetColors(asset.source)
        .then((colors) => ({ asset, colors: Array.isArray(colors) ? colors : [] }))
        .catch(() => ({ asset, colors: [] })),
    ),
  ).then((entries) => {
    const usage = new Map();
    for (const { asset, colors } of entries) {
      const project = projectForAsset(asset);
      for (const color of colors) {
        const key = String(color).toUpperCase();
        if (!usage.has(key)) usage.set(key, { color: key, projects: new Map() });
        const record = usage.get(key);
        if (!record.projects.has(project)) record.projects.set(project, []);
        record.projects.get(project).push(asset);
      }
    }
    return { usage, entries };
  });
}

export function renderProjectIconColors(projectName) {
  const list = document.getElementById("project-icon-colors-list");
  const empty = document.getElementById("project-icon-colors-empty");
  if (!list || !empty) return;

  list.innerHTML = "";
  list.dataset.project = projectName;
  empty.hidden = false;
  empty.textContent = "Loading colors from project icons...";

  collectColorUsageAcrossAssets()
    .then(({ usage, entries }) => {
      if (!list.isConnected || list.dataset.project !== projectName) return;
      const projectColors = new Set();
      for (const { asset, colors } of entries) {
        if (projectForAsset(asset) !== projectName) continue;
        for (const color of colors) projectColors.add(String(color).toUpperCase());
      }

      list.innerHTML = "";
      if (!projectColors.size) {
        empty.hidden = false;
        empty.textContent = "No colors found in this project's icons yet.";
        return;
      }
      empty.hidden = true;

      for (const color of Array.from(projectColors).sort()) {
        const record = usage.get(color);
        const item = document.createElement("div");
        item.className = "project-icon-color";

        const swatch = document.createElement("span");
        swatch.className = "project-icon-color-swatch";
        swatch.style.backgroundColor = color;
        swatch.setAttribute("aria-hidden", "true");

        const value = document.createElement("code");
        value.className = "project-icon-color-value";
        value.textContent = color;

        const tooltip = document.createElement("div");
        tooltip.className = "project-icon-color-tooltip";
        tooltip.setAttribute("role", "group");
        tooltip.setAttribute("aria-label", `Projects using ${color}`);

        const heading = document.createElement("p");
        heading.className = "project-icon-color-tooltip-heading";
        const projectNames = Array.from(record?.projects.keys() || []).sort();
        heading.textContent = `${color} · used in ${projectNames.length} project${projectNames.length === 1 ? "" : "s"}`;
        tooltip.appendChild(heading);

        const links = document.createElement("ul");
        links.className = "project-icon-color-tooltip-links";
        for (const name of projectNames) {
          const assets = record.projects.get(name) || [];
          const row = document.createElement("li");
          const link = document.createElement("a");
          link.href = projectRouteHref(name);
          link.textContent = name;
          const count = document.createElement("span");
          count.className = "project-icon-color-tooltip-count";
          count.textContent = `${assets.length} icon${assets.length === 1 ? "" : "s"}`;
          row.append(link, count);
          links.appendChild(row);
        }
        tooltip.appendChild(links);

        item.setAttribute("tabindex", "0");
        item.setAttribute("aria-label", `${color}, used in ${projectNames.join(", ")}`);
        item.append(swatch, value, tooltip);
        list.appendChild(item);
      }
    })
    .catch(() => {
      if (!list.isConnected || list.dataset.project !== projectName) return;
      list.innerHTML = "";
      empty.hidden = false;
      empty.textContent = "Colors unavailable.";
    });
}

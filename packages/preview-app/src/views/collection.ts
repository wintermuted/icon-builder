import { buildProjectAssets, projectRouteHref, primaryProjectAsset } from "../project/model.js";
import { appState } from "../app-state.js";

export function renderLogos(assets) {
  const groupsRoot = document.getElementById("logo-groups");
  if (!groupsRoot) return;

  groupsRoot.innerHTML = "";
  groupsRoot.classList.add("logo-groups--project");

  const groupedAssets = buildProjectAssets(assets);

  for (const [projectName, groupAssets] of groupedAssets) {
    const groupSection = document.createElement("section");
    groupSection.className = "logo-group";

    const header = document.createElement("div");
    header.className = "logo-group-header";

    const heading = document.createElement("h4");
    const titleLink = document.createElement("a");
    titleLink.className = "project-title-link";
    titleLink.href = projectRouteHref(projectName);
    titleLink.textContent = projectName;
    heading.appendChild(titleLink);

    const count = document.createElement("p");
    count.textContent = `${groupAssets.length} item${groupAssets.length === 1 ? "" : "s"}`;

    const grid = document.createElement("div");
    grid.className = "asset-grid";

    header.appendChild(heading);
    header.appendChild(count);
    groupSection.appendChild(header);

    const visibleAssets = [primaryProjectAsset(projectName, groupAssets)].filter(Boolean);

    if (visibleAssets.length === 0) {
      const empty = document.createElement("div");
      empty.className = "project-empty-state";
      const emptyLink = document.createElement("a");
      emptyLink.href = projectRouteHref(projectName);
      emptyLink.className = "project-empty-cta";
      emptyLink.innerHTML =
        '<i data-lucide="image-plus" aria-hidden="true"></i><span>Add first asset</span>';
      empty.appendChild(emptyLink);
      groupSection.appendChild(empty);
    } else {
      for (const asset of visibleAssets) {
        const tile = document.createElement("article");
        tile.className = "asset-tile";

        const frame = document.createElement("div");
        frame.className = "logo-frame";

        const img = document.createElement("img");
        img.src = `../${asset.source}`;
        img.alt = asset.label;

        const title = document.createElement("h3");
        title.textContent = asset.label;

        const idText = document.createElement("p");
        idText.textContent = asset.id;

        const detailLink = document.createElement("a");
        detailLink.className = "asset-detail-link";
        detailLink.href = `#asset/${encodeURIComponent(asset.id)}`;
        detailLink.textContent = "View details";

        const iconLink = document.createElement("a");
        iconLink.className = "project-icon-link";
        iconLink.href = projectRouteHref(projectName);
        iconLink.setAttribute("aria-label", `Open project page for ${projectName}`);
        iconLink.appendChild(img);
        frame.appendChild(iconLink);
        tile.prepend(frame);

        if (appState.activeGroupingMode !== "project") {
          tile.appendChild(title);
          tile.appendChild(idText);
          tile.appendChild(detailLink);
        }
        grid.appendChild(tile);
      }
      groupSection.appendChild(grid);
    }

    groupsRoot.appendChild(groupSection);
  }
}

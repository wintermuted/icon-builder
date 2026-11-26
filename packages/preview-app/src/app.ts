import {
  getRouteFromHash,
  applyThemeFromQuery,
  wireThemeToggle,
  wireTopNav,
  loadJson,
} from "./app-shell.js";
import { renderAssetDetail } from "./views/asset-detail.js";
import { renderSourceDetail } from "./views/source-detail.js";
import { renderProjectDetail } from "./views/project-detail.js";
import { appState } from "./app-state.js";
import {
  wireStickyHeaderOffset,
  wireNewProjectModal,
  wireAssetDetailSidebars,
} from "./views/shell-controls.js";
import {
  wireGroundingDropZone,
  wireGenerateAssetPrompt,
  wireProjectRename,
  wireProjectPromptCarousel,
  wireSourceReferenceCopy,
} from "./project/actions.js";
import { renderLogos } from "./views/collection.js";

function setMainViewVisibility(route) {
  const logosSection = document.getElementById("logos");
  const diagramsSection = document.getElementById("diagrams");
  const assetDetailSection = document.getElementById("asset-detail");
  const sourceDetailSection = document.getElementById("source-detail");
  const projectDetailSection = document.getElementById("project-detail");
  if (
    !logosSection ||
    !diagramsSection ||
    !assetDetailSection ||
    !sourceDetailSection ||
    !projectDetailSection
  )
    return;

  const onAssetPage = route.page === "asset";
  const onSourcePage = route.page === "source";
  const onProjectPage = route.page === "project";
  const onDetailPage = onAssetPage || onSourcePage || onProjectPage;

  logosSection.classList.toggle("is-hidden", onDetailPage);
  diagramsSection.classList.toggle("is-hidden", onDetailPage);
  assetDetailSection.classList.toggle("is-hidden", !onAssetPage);
  sourceDetailSection.classList.toggle("is-hidden", !onSourcePage);
  projectDetailSection.classList.toggle("is-hidden", !onProjectPage);
}

function renderCurrentRoute() {
  const route = getRouteFromHash();
  setMainViewVisibility(route);
  if (route.page === "asset") {
    renderAssetDetail(route.assetId);
    return;
  }

  if (route.page === "source") {
    renderSourceDetail(route.projectName, route.sourcePath);
    return;
  }

  if (route.page === "project") {
    renderProjectDetail(route.projectName);
  }
}

async function renderDiagrams() {
  const grid = document.getElementById("diagram-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "default";
  mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme });

  for (const item of appState.diagramData) {
    const tile = document.createElement("article");
    tile.className = "asset-tile";

    const title = document.createElement("h3");
    title.textContent = item.title;

    const wrapper = document.createElement("div");
    wrapper.className = "mermaid";
    wrapper.textContent = item.code;

    tile.appendChild(title);
    tile.appendChild(wrapper);
    grid.appendChild(tile);
  }

  await mermaid.run({ querySelector: ".mermaid" });
}

async function init() {
  applyThemeFromQuery();
  wireThemeToggle(renderDiagrams);
  wireTopNav();
  wireStickyHeaderOffset();
  wireNewProjectModal();
  wireGroundingDropZone();
  wireGenerateAssetPrompt();
  wireProjectRename();
  wireProjectPromptCarousel();
  wireSourceReferenceCopy();
  wireAssetDetailSidebars();

  const [assetManifest, specs] = await Promise.all([
    loadJson("../manifests/assets.json"),
    loadJson("./spec-index.json"),
  ]);

  appState.diagramData = specs.diagrams ?? [];
  appState.assetData = assetManifest.assets ?? [];
  appState.assetById = new Map(appState.assetData.map((asset) => [asset.id, asset]));
  const projectSteer = Array.isArray(assetManifest.projects) ? assetManifest.projects : [];
  appState.projectMetaByName = new Map(
    projectSteer
      .filter((project) => project && project.name)
      .map((project) => [String(project.name).trim(), project]),
  );
  renderLogos(appState.assetData);
  await renderDiagrams();

  renderCurrentRoute();
  window.addEventListener("hashchange", renderCurrentRoute);
}

init().catch((error) => {
  console.error(error);
  const content = document.querySelector(".preview-content");
  if (content) {
    content.innerHTML = `<section class="card"><div class="card-header"><h3>Preview failed</h3></div><div class="card-body"><p>${error.message}</p></div></section>`;
  }
});

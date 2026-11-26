import { appState } from "../app-state.js";
import {
  projectForAsset,
  normalizeProjectSteer,
  updateProjectFavoriteColor,
  normalizeProjectSlots,
  resolveAssetPath,
  resolveSlotPreview,
} from "../project/model.js";
import { showToast, slugify, normalizeProjectPrompt } from "../app-shell.js";
import { renderProjectIconColors } from "../project/icon-colors.js";
import { renderActiveProjectPrompt } from "../project/actions.js";
import { renderProjectSources } from "../project/sources.js";
import { renderAssetColorList } from "../editor/colors.js";

export function renderProjectDetail(projectName) {
  const title = document.getElementById("project-detail-title");
  const deepLink = document.getElementById("project-deep-link");
  const grid = document.getElementById("project-asset-grid");
  const notesList = document.getElementById("project-steer-notes");
  const sourcesGrid = document.getElementById("project-steer-sources");
  const emptyState = document.getElementById("project-steer-empty");
  const favoriteColorsRoot = document.getElementById("project-favorite-colors");
  const favoriteColorsEmpty = document.getElementById("project-favorite-colors-empty");
  const customColorForm = document.getElementById("project-custom-color-form");
  const customColorInput = document.getElementById("project-custom-color-input");
  const customColorValue = document.getElementById("project-custom-color-value");
  const customColorStatus = document.getElementById("project-custom-color-status");
  const slotsGrid = document.getElementById("project-icon-slots");
  const promptsRoot = document.getElementById("project-sample-prompts");
  const promptCopyStatus = document.getElementById("project-prompt-copy-status");
  const docsRoot = document.getElementById("project-documentation-links");
  const generateButton = document.getElementById("project-generate-new");
  const generatePanel = document.getElementById("project-generate-panel");
  const renameForm = document.getElementById("project-rename-form");
  const renameInput = document.getElementById("project-rename-input");
  const renameStatus = document.getElementById("project-rename-status");
  if (
    !title ||
    !deepLink ||
    !grid ||
    !notesList ||
    !sourcesGrid ||
    !emptyState ||
    !favoriteColorsRoot ||
    !favoriteColorsEmpty ||
    !customColorForm ||
    !customColorInput ||
    !customColorValue ||
    !customColorStatus ||
    !slotsGrid ||
    !promptsRoot ||
    !promptCopyStatus ||
    !docsRoot ||
    !generateButton ||
    !generatePanel ||
    !renameForm ||
    !renameInput ||
    !renameStatus
  )
    return;

  grid.innerHTML = "";
  notesList.innerHTML = "";
  sourcesGrid.innerHTML = "";
  favoriteColorsRoot.innerHTML = "";
  customColorStatus.textContent = "";
  slotsGrid.innerHTML = "";
  promptCopyStatus.textContent = "";
  docsRoot.innerHTML = "";
  const targetProject = String(projectName || "").trim();
  const projectMeta = appState.projectMetaByName.get(targetProject);
  const projectAssets = appState.assetData
    .filter((asset) => projectForAsset(asset) === targetProject)
    .sort((a, b) => a.label.localeCompare(b.label));

  if (!targetProject || (!projectMeta && !projectAssets.length)) {
    title.textContent = "Project not found";
    deepLink.href = window.location.href;
    deepLink.setAttribute("aria-label", "Project deep link");
    emptyState.classList.remove("is-hidden");
    return;
  }

  title.textContent = targetProject;
  renameForm.dataset.project = targetProject;
  renameForm.hidden = true;
  renameInput.value = targetProject;
  renameStatus.textContent = "";
  deepLink.href = window.location.href;
  deepLink.setAttribute("aria-label", `${targetProject} project deep link`);

  const steer = normalizeProjectSteer(targetProject);

  const syncFavoriteSwatches = (color) => {
    const selected = steer.favoriteColors.includes(color);
    for (const swatch of sourcesGrid.querySelectorAll(
      `.source-material-swatch[data-color="${color}"]`,
    )) {
      swatch.setAttribute("aria-pressed", String(selected));
      swatch.setAttribute(
        "aria-label",
        `${selected ? "Remove" : "Select"} ${color} as a project favorite`,
      );
    }
  };

  const applyFavoriteResult = (result, color) => {
    steer.favoriteColors = result.favoriteColors || [];
    steer.customColors = result.customColors || [];
    renderFavoriteColors();
    syncFavoriteSwatches(color);
  };

  const renderFavoriteColors = () => {
    favoriteColorsRoot.innerHTML = "";
    favoriteColorsEmpty.hidden = steer.favoriteColors.length > 0;
    for (const color of steer.favoriteColors) {
      const item = document.createElement("div");
      item.className = "project-favorite-color";
      const swatch = document.createElement("span");
      swatch.className = "project-favorite-color-swatch";
      swatch.style.setProperty("--favorite-color", color);
      swatch.setAttribute("aria-hidden", "true");
      const value = document.createElement("code");
      value.textContent = color;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "project-favorite-color-remove";
      remove.setAttribute("aria-label", `Remove ${color} from project favorites`);
      remove.title = "Remove color";
      remove.innerHTML = '<i data-lucide="x" aria-hidden="true"></i>';
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          const result = await updateProjectFavoriteColor(
            targetProject,
            color,
            false,
            steer.customColors.includes(color),
          );
          applyFavoriteResult(result, color);
        } catch (error) {
          customColorStatus.textContent = error.message;
          remove.disabled = false;
        }
      });
      item.append(swatch, value, remove);
      favoriteColorsRoot.appendChild(item);
    }
    if (typeof lucide !== "undefined") lucide.createIcons();
  };

  customColorValue.textContent = customColorInput.value.toUpperCase();
  customColorInput.oninput = () => {
    customColorValue.textContent = customColorInput.value.toUpperCase();
  };
  customColorForm.onsubmit = async (event) => {
    event.preventDefault();
    const color = customColorInput.value.toUpperCase();
    customColorStatus.textContent = "Adding color...";
    try {
      const result = await updateProjectFavoriteColor(targetProject, color, true, true);
      applyFavoriteResult(result, color);
      customColorStatus.textContent = "";
      showToast(`${color} added to project favorites.`);
    } catch (error) {
      customColorStatus.textContent = error.message;
    }
  };
  renderFavoriteColors();
  renderProjectIconColors(targetProject);

  const slots = normalizeProjectSlots(targetProject);
  const projectSlug = String(projectMeta?.slug || slugify(targetProject));
  generatePanel.hidden = true;
  generateButton.setAttribute("aria-expanded", "false");
  appState.projectSamplePrompts =
    Array.isArray(projectMeta?.samplePrompts) && projectMeta.samplePrompts.length
      ? projectMeta.samplePrompts
      : [
          `/create-svg-asset\n\nProject: ${targetProject}\nDirectory: assets/svg/${projectSlug}/`,
          `/create-svg-asset\n\nCreate a minimal geometric mark using the uploaded steering source material.\nBase idea: combine a strong silhouette with one distinctive cutout or negative-space detail.\n\nProject: ${targetProject}\nDirectory: assets/svg/${projectSlug}/`,
          `/create-svg-asset\n\nCreate an expressive symbol using the uploaded steering source material.\nBase idea: translate the project's core purpose into a modular emblem that remains recognizable at favicon size.\n\nProject: ${targetProject}\nDirectory: assets/svg/${projectSlug}/`,
        ];
  appState.projectSamplePrompts = appState.projectSamplePrompts.map((prompt) =>
    normalizeProjectPrompt(prompt, targetProject, projectSlug),
  );
  appState.activeProjectPromptIndex = 0;
  renderActiveProjectPrompt();

  const documentationLinks = [
    [projectMeta?.documentation || `assets/svg/${projectSlug}/README.md`, "Project README"],
    [".github/prompts/create-svg-asset.prompt.md", "Create SVG Asset prompt"],
    [".github/skills/wm-asset-manifest-spec/SKILL.md", "Manifest specification"],
    [".github/skills/wm-asset-authoring-workflow/SKILL.md", "Authoring workflow"],
  ];
  for (const [path, label] of documentationLinks) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = resolveAssetPath(path);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    item.appendChild(link);
    docsRoot.appendChild(item);
  }
  const hasSteer = steer.notes.length > 0 || steer.sources.length > 0;
  emptyState.classList.toggle("is-hidden", hasSteer);

  for (const slot of slots) {
    const card = document.createElement("article");
    card.className = "icon-slot-card";

    const header = document.createElement("div");
    header.className = "icon-slot-header";

    const heading = document.createElement("h5");
    heading.textContent = slot.title;

    const usage = document.createElement("p");
    usage.className = "icon-slot-usage";
    usage.textContent = slot.usage;

    const preview = resolveSlotPreview(slot);
    const body = document.createElement("div");
    body.className = "icon-slot-body";

    if (preview.sourceType === "asset" || preview.sourceType === "src") {
      const img = document.createElement("img");
      img.className = "icon-slot-image";
      img.src = preview.src;
      img.alt = `${slot.title} preview`;

      if (preview.href) {
        const link = document.createElement("a");
        link.href = preview.href;
        link.className = "icon-slot-image-link";
        link.appendChild(img);
        body.appendChild(link);
      } else {
        body.appendChild(img);
      }
    } else if (preview.sourceType === "url") {
      const link = document.createElement("a");
      link.href = preview.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = preview.label;
      body.appendChild(link);
    } else {
      const empty = document.createElement("p");
      empty.className = "icon-slot-empty";
      empty.textContent = "No source assigned";
      body.appendChild(empty);
    }

    if (slot.note) {
      const note = document.createElement("p");
      note.className = "icon-slot-note";
      note.textContent = slot.note;
      body.appendChild(note);
    }

    header.appendChild(heading);
    header.appendChild(usage);
    card.appendChild(header);
    card.appendChild(body);
    slotsGrid.appendChild(card);
  }

  for (const note of steer.notes) {
    const item = document.createElement("li");
    item.textContent = note;
    notesList.appendChild(item);
  }

  renderProjectSources({
    steer,
    targetProject,
    applyFavoriteResult,
    sourcesGrid,
  });

  if (typeof lucide !== "undefined") lucide.createIcons();

  for (const asset of projectAssets) {
    const tile = document.createElement("article");
    tile.className = "asset-tile";
    const assetHref = `#asset/${encodeURIComponent(asset.id)}`;

    const frame = document.createElement("div");
    frame.className = "logo-frame";

    const img = document.createElement("img");
    img.src = `../${asset.source}`;
    img.alt = asset.label;

    const imageLink = document.createElement("a");
    imageLink.className = "asset-preview-link";
    imageLink.href = assetHref;
    imageLink.appendChild(frame);

    const assetTitle = document.createElement("h3");
    assetTitle.textContent = asset.label;

    const titleLink = document.createElement("a");
    titleLink.className = "asset-title-link";
    titleLink.href = assetHref;
    titleLink.appendChild(assetTitle);

    const colorsRoot = document.createElement("div");
    colorsRoot.className = "asset-colors";
    colorsRoot.setAttribute("aria-label", `Colors used in ${asset.label}`);
    const colorsLabel = document.createElement("span");
    colorsLabel.className = "asset-colors-label";
    colorsLabel.textContent = "Colors";
    const colorsList = document.createElement("div");
    colorsList.className = "asset-colors-list";
    colorsList.textContent = "Loading...";
    colorsRoot.appendChild(colorsLabel);
    colorsRoot.appendChild(colorsList);

    renderAssetColorList(colorsList, asset);

    const idText = document.createElement("p");
    idText.textContent = asset.id;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "asset-copy-link btn btn-sm";
    copyButton.setAttribute("aria-label", `Copy ${asset.label} deep link`);
    copyButton.title = "Copy asset deep link";
    copyButton.innerHTML = '<i data-lucide="copy" aria-hidden="true"></i>';
    copyButton.addEventListener("click", async () => {
      const deepLink = new URL(window.location.href);
      deepLink.hash = assetHref.slice(1);
      try {
        await navigator.clipboard.writeText(deepLink.href);
        showToast("Asset link copied.");
      } catch {
        showToast("Unable to copy asset link.");
      }
    });

    const footer = document.createElement("div");
    footer.className = "asset-tile-footer";
    footer.appendChild(idText);
    footer.appendChild(copyButton);

    frame.appendChild(img);
    tile.appendChild(imageLink);
    tile.appendChild(titleLink);
    tile.appendChild(colorsRoot);
    tile.appendChild(footer);
    grid.appendChild(tile);
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

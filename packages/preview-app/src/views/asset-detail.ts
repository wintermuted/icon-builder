import { appState } from "../app-state.js";
import {
  projectForAsset,
  projectRouteHref,
  uniqueSortedSizes,
  normalizeProjectSteer,
} from "../project/model.js";
import {
  assetModified,
  assetSvgDataCache,
  assetLayerEdits,
  assetViewBoxEdits,
  assetAccessibilityEdits,
  assetSourceSizeEdits,
  assetGroupEdits,
  assetCustomColors,
} from "../svg/editor-state.js";
import { showToast } from "../app-shell.js";
import { loadAssetSvgData } from "../svg/analysis.js";
import { parseSvgViewBox } from "../svg/geometry.js";
import {
  renderAssetPrimarySvg,
  setPrimarySvgLayerHighlight,
  setPrimarySvgMultiSelectHighlight,
  setPrimarySvgColorHighlight,
  describeSvgRegions,
  describeSvgLayers,
  setAssetPrimarySvgSize,
} from "../svg/preview.js";
import { renderAssetLayers } from "../editor/layers.js";
import { applyAssetLayerEdits, applyAssetAccessibility } from "../svg/apply-edits.js";
import { enablePrimaryLayerInteraction } from "../canvas/interactions.js";
import { renderAssetColorList, renderStaticAssetColorList } from "../editor/colors.js";
import { renderAssetDiagnostics } from "../editor/diagnostics.js";

export function renderAssetDetail(assetId) {
  const title = document.getElementById("asset-detail-title");
  const saveButton = document.getElementById("asset-save-button");
  const deepLink = document.getElementById("asset-deep-link");
  const projectLink = document.getElementById("asset-project-link");
  const overview = document.getElementById("asset-detail-overview");
  const primaryPreview = document.getElementById("asset-primary-preview");
  const primarySvg = document.getElementById("asset-primary-svg");
  const primaryTooltip = document.getElementById("asset-primary-tooltip");
  const primaryHandles = document.getElementById("asset-primary-handles");
  const primaryGuides = document.getElementById("asset-primary-guides");
  const primaryPoints = document.getElementById("asset-primary-points");
  const primaryShapeMode = document.getElementById("asset-primary-shape-mode");
  const primaryGrid = document.getElementById("asset-primary-grid");
  const gridVisibilityToggle = document.getElementById("asset-grid-visibility-toggle");
  const gridSnapToggle = document.getElementById("asset-grid-snap-toggle");
  const gridSizeInput = document.getElementById("asset-grid-size-input");
  const viewBoxInputs = ["x", "y", "width", "height"].map((name) =>
    document.getElementById(`asset-viewbox-${name}`),
  );
  const viewBoxValue = document.getElementById("asset-viewbox-value");
  const viewBoxEditor = document.getElementById("asset-viewbox-editor");
  const viewBoxForm = document.getElementById("asset-viewbox-form");
  const viewBoxCancel = document.getElementById("asset-viewbox-cancel");
  const primaryCanvas = document.getElementById("asset-primary-canvas");
  const previewSizeSelect = document.getElementById("asset-preview-size-select");
  const previewSizeListToggle = document.getElementById("asset-preview-size-list-toggle");
  const colorsSection = document.getElementById("asset-detail-colors-section");
  const colorsList = document.getElementById("asset-detail-colors");
  const projectColorsList = document.getElementById("asset-project-colors");
  const customColorsList = document.getElementById("asset-custom-colors");
  const customColorForm = document.getElementById("asset-custom-color-form");
  const customColorInput = document.getElementById("asset-custom-color-input");
  const customColorAddButton = document.getElementById("asset-custom-color-add");
  const highlightStatus = document.getElementById("asset-color-highlight-status");
  const diagnostics = document.getElementById("asset-detail-diagnostics");
  const layersSection = document.getElementById("asset-detail-layers-section");
  const layersList = document.getElementById("asset-detail-layers");
  const layerEditorPanel = document.getElementById("asset-layer-editor-panel");
  const layerActions = document.getElementById("asset-layer-actions");
  const sizeGrid = document.getElementById("asset-size-grid");
  if (
    !title ||
    !saveButton ||
    !deepLink ||
    !projectLink ||
    !overview ||
    !primaryPreview ||
    !primarySvg ||
    !primaryTooltip ||
    !primaryHandles ||
    !primaryGuides ||
    !primaryCanvas ||
    !previewSizeSelect ||
    !previewSizeListToggle ||
    !colorsSection ||
    !colorsList ||
    !projectColorsList ||
    !customColorsList ||
    !customColorForm ||
    !customColorInput ||
    !customColorAddButton ||
    !highlightStatus ||
    !diagnostics ||
    !layersSection ||
    !layersList ||
    !layerEditorPanel ||
    !layerActions ||
    !sizeGrid ||
    !viewBoxValue ||
    !viewBoxEditor ||
    !viewBoxForm ||
    !viewBoxCancel ||
    viewBoxInputs.some((input) => !input)
  )
    return;

  sizeGrid.innerHTML = "";
  colorsList.textContent = "";
  projectColorsList.textContent = "";
  customColorsList.textContent = "";
  highlightStatus.textContent = "";
  diagnostics.textContent = "";
  layersList.textContent = "";
  layerEditorPanel.hidden = true;
  layerEditorPanel.replaceChildren();
  layerActions.hidden = true;
  layerActions.replaceChildren();
  primaryCanvas.hidden = false;
  sizeGrid.hidden = true;
  previewSizeListToggle.setAttribute("aria-pressed", "false");
  const asset = appState.assetById.get(assetId);

  if (!asset) {
    appState.activePrimaryLayerInteractionCleanup?.();
    appState.activePrimaryLayerInteractionCleanup = null;
    title.textContent = "Asset not found";
    deepLink.href = window.location.href;
    projectLink.href = "#logos";
    projectLink.setAttribute("aria-label", "Back to all assets");
    projectLink.title = "Back to all assets";
    overview.hidden = true;
    layersSection.hidden = true;
    layerActions.hidden = true;
    return;
  }

  const projectName = projectForAsset(asset);
  const syncSaveButton = () => {
    saveButton.disabled = !assetModified.has(asset.id);
  };
  syncSaveButton();
  saveButton.onclick = async () => {
    const svg = primarySvg.querySelector("svg");
    if (!svg || !assetModified.has(asset.id)) return;
    saveButton.disabled = true;
    try {
      const response = await fetch("/~asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: asset.id,
          svg: new XMLSerializer().serializeToString(svg),
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Asset save failed");
      assetSvgDataCache.delete(asset.source);
      assetLayerEdits.delete(asset.id);
      assetViewBoxEdits.delete(asset.id);
      assetAccessibilityEdits.delete(asset.id);
      assetSourceSizeEdits.delete(asset.id);
      assetGroupEdits.delete(asset.id);
      assetModified.delete(asset.id);
      showToast(`Saved ${result.source}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Asset save failed");
    } finally {
      syncSaveButton();
    }
  };
  loadAssetSvgData(asset.source).then((data) => {
    if (!primarySvg.isConnected || primarySvg.dataset.assetId !== asset.id) return;
    const viewBox = assetViewBoxEdits.get(asset.id) || parseSvgViewBox(data.viewBox);
    if (!viewBox) return;
    assetViewBoxEdits.set(asset.id, viewBox);
    viewBoxInputs.forEach((input, index) => {
      input.value = String(viewBox[index]);
    });
    viewBoxValue.textContent = viewBox.join(" ");
  });
  const updateViewBox = () => {
    const viewBox = viewBoxInputs.map((input) => Number(input.value));
    if (
      !Number.isFinite(viewBox[0]) ||
      !Number.isFinite(viewBox[1]) ||
      !Number.isFinite(viewBox[2]) ||
      !Number.isFinite(viewBox[3]) ||
      viewBox[2] <= 0 ||
      viewBox[3] <= 0
    )
      return;
    assetViewBoxEdits.set(asset.id, viewBox);
    viewBoxValue.textContent = viewBox.join(" ");
    const svg = primarySvg.querySelector("svg");
    if (svg) svg.setAttribute("viewBox", viewBox.join(" "));
    assetModified.add(asset.id);
    syncSaveButton();
  };
  viewBoxForm.onsubmit = (event) => {
    event.preventDefault();
    updateViewBox();
    viewBoxEditor.hidden = true;
  };
  viewBoxCancel.onclick = () => {
    viewBoxEditor.hidden = true;
  };
  document.getElementById("asset-viewbox-edit").onclick = () => {
    viewBoxEditor.hidden = false;
  };
  title.textContent = asset.label;
  deepLink.href = window.location.href;
  deepLink.setAttribute("aria-label", `${asset.label} deep link`);
  projectLink.href = projectRouteHref(projectName);
  projectLink.setAttribute("aria-label", `Back to ${projectName}`);
  projectLink.title = `Back to ${projectName}`;
  overview.hidden = false;
  layersSection.hidden = false;
  const previewSizes = uniqueSortedSizes(asset);
  const defaultPreviewSize = "fit";
  const fitOption = document.createElement("option");
  fitOption.value = "fit";
  fitOption.textContent = "Fit width";
  fitOption.selected = true;
  previewSizeSelect.replaceChildren(
    fitOption,
    ...previewSizes.map((size) => {
      const option = document.createElement("option");
      option.value = String(size);
      option.textContent = `${size}px`;
      return option;
    }),
  );
  renderAssetPrimarySvg(primarySvg, asset, defaultPreviewSize);
  appState.activePrimaryLayerInteractionCleanup?.();
  const primaryInteractionState = { updateTooltip: () => {} };
  const layersController = renderAssetLayers(
    layersList,
    layerEditorPanel,
    layerActions,
    asset,
    (layerNumber, highlighted) => setPrimarySvgLayerHighlight(primarySvg, layerNumber, highlighted),
    () => {
      applyAssetLayerEdits(primarySvg.querySelector("svg"), asset.id);
      syncSaveButton();
    },
    (layerNumber) => primaryInteractionState.updateTooltip(layerNumber),
    (layerNumbers) => setPrimarySvgMultiSelectHighlight(primarySvg, layerNumbers),
    () => {
      if (primarySvg.isConnected) renderAssetDetail(asset.id);
    },
  );
  const primaryInteraction = enablePrimaryLayerInteraction(
    primarySvg,
    primaryPreview,
    primaryTooltip,
    primaryHandles,
    primaryGuides,
    asset,
    layersController,
    primaryPoints,
    primaryShapeMode,
    primaryGrid,
    gridVisibilityToggle,
    gridSnapToggle,
    gridSizeInput,
    syncSaveButton,
  );
  primaryInteractionState.updateTooltip = primaryInteraction.updateTooltip;
  appState.activePrimaryLayerInteractionCleanup = primaryInteraction.cleanup;
  renderAssetColorList(colorsList, asset, (color, highlighted) => {
    const regions = setPrimarySvgColorHighlight(primarySvg, color, highlighted);
    highlightStatus.textContent =
      highlighted && regions.length
        ? `${describeSvgRegions(regions)} highlighted for ${color}; ${describeSvgLayers(regions)}.`
        : "";
  });
  const projectPalette = normalizeProjectSteer(projectName).favoriteColors;
  renderStaticAssetColorList(projectColorsList, projectPalette, "No project favorites");
  const renderCustomColors = () => {
    renderStaticAssetColorList(customColorsList, assetCustomColors.get(asset.id) || []);
  };
  const addCustomColor = () => {
    const color = customColorInput.value.toUpperCase();
    const colors = assetCustomColors.get(asset.id) || [];
    if (!colors.includes(color)) {
      assetCustomColors.set(asset.id, [...colors, color]);
      assetModified.add(asset.id);
      syncSaveButton();
    }
    renderCustomColors();
  };
  renderCustomColors();
  customColorForm.onsubmit = (event) => event.preventDefault();
  customColorAddButton.onclick = () => {
    if (customColorInput.showPicker) customColorInput.showPicker();
    else customColorInput.click();
  };
  customColorInput.onchange = addCustomColor;
  renderAssetDiagnostics(
    diagnostics,
    asset,
    () => {
      applyAssetAccessibility(primarySvg.querySelector("svg"), asset.id);
      assetModified.add(asset.id);
      syncSaveButton();
    },
    () => {
      const svg = primarySvg.querySelector("svg");
      const sourceSize = assetSourceSizeEdits.get(asset.id);
      if (svg && sourceSize) {
        svg.setAttribute("width", String(sourceSize.width));
        svg.setAttribute("height", String(sourceSize.height));
      }
      assetModified.add(asset.id);
      syncSaveButton();
    },
  );

  const showCanvasSize = (size) => {
    previewSizeSelect.value = String(size);
    setAssetPrimarySvgSize(primarySvg, asset, size);
    primaryCanvas.hidden = false;
    sizeGrid.hidden = true;
    previewSizeListToggle.setAttribute("aria-pressed", "false");
    previewSizeListToggle.innerHTML =
      '<i data-lucide="grid-2x2" aria-hidden="true"></i>Compare sizes';
    if (typeof lucide !== "undefined") lucide.createIcons();
  };

  previewSizeSelect.onchange = () =>
    showCanvasSize(previewSizeSelect.value === "fit" ? "fit" : Number(previewSizeSelect.value));
  previewSizeListToggle.onclick = () => {
    const showingList = !sizeGrid.hidden;
    primaryCanvas.hidden = !showingList;
    sizeGrid.hidden = showingList;
    previewSizeListToggle.setAttribute("aria-pressed", String(!showingList));
    previewSizeListToggle.innerHTML = showingList
      ? '<i data-lucide="grid-2x2" aria-hidden="true"></i>Compare sizes'
      : '<i data-lucide="square" aria-hidden="true"></i>Back to canvas';
    if (typeof lucide !== "undefined") lucide.createIcons();
  };

  for (const size of previewSizes) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "size-preview-card";
    card.setAttribute("aria-label", `Show ${asset.label} at ${size}px on the canvas`);

    const displaySize = Math.min(size, 220);
    const frameSize = Math.max(displaySize + 32, 120);
    const frame = document.createElement("div");
    frame.className = "size-preview-frame";
    frame.style.setProperty("--frame-size", `${frameSize}px`);
    frame.style.setProperty("--img-size", `${displaySize}px`);

    const img = document.createElement("img");
    img.src = `../${asset.source}`;
    img.alt = `${asset.label} at ${size}px`;

    const caption = document.createElement("p");
    caption.className = "size-preview-caption";
    caption.textContent = `${size}px`;

    frame.appendChild(img);
    card.appendChild(frame);
    card.appendChild(caption);
    card.addEventListener("click", () => showCanvasSize(size));
    sizeGrid.appendChild(card);
  }
}

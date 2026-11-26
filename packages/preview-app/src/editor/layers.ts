import { loadAssetSvgData, buildElementTree } from "../svg/analysis.js";
import {
  assetPendingElementSelection,
  assetLayerEdits,
  assetModified,
  assetPendingGroupFocus,
} from "../svg/editor-state.js";
import { assetLayerSelection, renderAssetLayerActions } from "./actions.js";
import { createAssetElement, combineAssetLayers } from "../svg/mutations.js";
import { showToast } from "../app-shell.js";
import type { Asset, LayerController } from "../types.js";
import { createLayerRow } from "./layer-row.js";
import { createGroupTree } from "./group-tree.js";

export function renderAssetLayers(
  root,
  editorPanel,
  actionsBar,
  asset: Asset,
  onHighlight,
  onEdit,
  onSelect,
  onMultiSelectChange,
  onRefresh: () => void,
) {
  root.textContent = "Loading...";
  root.dataset.assetId = asset.id;
  editorPanel.hidden = true;
  editorPanel.replaceChildren();
  actionsBar.hidden = true;
  actionsBar.replaceChildren();

  // Populated once asset data loads; exposes hover/selection sync methods so
  // the primary preview canvas can stay in sync with this elements list.
  const controller: LayerController = {
    setHoveredLayer: () => {},
    clearHoveredLayer: () => {},
    selectLayer: () => {},
    getSelectedLayer: () => null,
    getMultiSelection: () => [],
    syncDimensionInputs: () => {},
  };

  loadAssetSvgData(asset.source)
    .then((data) => {
      if (!root.isConnected || root.dataset.assetId !== asset.id) return;
      root.textContent = "";
      const pendingSelection = assetPendingElementSelection.get(asset.id);
      if (pendingSelection !== undefined) assetPendingElementSelection.delete(asset.id);
      let selectedLayerNumber = pendingSelection ?? null;
      // Elements shift-clicked together (canvas or panel row) so multiple can be
      // moved/inspected as a group. Distinct from the checkbox-driven `selection`
      // Set below, which only tracks candidates for the "combine into group"
      // action - keeping the two decoupled means shift-clicking to multi-select
      // never clobbers an in-progress combine checkbox selection, and vice versa.
      let multiSelection = new Set(selectedLayerNumber !== null ? [selectedLayerNumber] : []);
      onSelect?.(selectedLayerNumber);
      onMultiSelectChange?.([...multiSelection]);
      let hoveredLayerNumber = null;
      let focusedLayerNumber = null;
      const layerItems = new Map();
      const layerButtons = new Map();
      const layerEditButtons = new Map();
      // Geometry textareas keyed `${layerNumber}:${attrName}`, so on-canvas point
      // dragging can push updated values back into the open detail editor.
      const geometryInputs = new Map();
      const layerCheckboxes = new Map();
      const layerEdits = assetLayerEdits.get(asset.id) || new Map();
      const selection = assetLayerSelection(asset.id);
      for (const layerNumber of selection) {
        if (layerNumber > data.paintLayerCount) selection.delete(layerNumber);
      }
      const addElement = (shape, container) => {
        createAssetElement(asset, shape, container, (newNumber) => {
          if (newNumber) assetPendingElementSelection.set(asset.id, newNumber);
          assetModified.add(asset.id);
          showToast(`Added a new ${shape} element.`);
          onRefresh();
        });
      };
      const {
        status: combineStatus,
        combineButton,
        clearButton,
      } = renderAssetLayerActions(
        actionsBar,
        data,
        () => {
          const combining = [...selection];
          combineAssetLayers(asset, combining, (combinedNumbers) => {
            assetModified.add(asset.id);
            selection.clear();
            if (combinedNumbers?.length)
              assetPendingGroupFocus.set(asset.id, new Set(combinedNumbers));
            showToast(
              `Combined ${combinedNumbers.length || combining.length} elements into a group.`,
            );
            onRefresh();
          });
        },
        () => {
          selection.clear();
          syncSelection();
        },
        (shape) => addElement(shape, data.svg),
      );
      function syncSelection() {
        for (const [layerNumber, item] of layerItems) {
          const isSelected = selection.has(layerNumber);
          item.classList.toggle("is-multi-selected", isSelected);
          const checkbox = layerCheckboxes.get(layerNumber);
          if (checkbox) checkbox.checked = isSelected;
        }
        combineButton.disabled = selection.size < 2;
        clearButton.hidden = selection.size === 0;
        combineStatus.textContent =
          selection.size === 0
            ? "Select 2 elements to combine."
            : selection.size === 1
              ? "Select one more element to combine."
              : `${selection.size} selected. Ready to combine.`;
      }
      const syncHighlight = () => {
        const highlightedLayerNumber =
          hoveredLayerNumber ?? focusedLayerNumber ?? selectedLayerNumber;
        for (const [layerNumber, item] of layerItems) {
          item.classList.toggle("is-active", layerNumber === highlightedLayerNumber);
          item.classList.toggle("is-selected", multiSelection.has(layerNumber));
          layerButtons
            .get(layerNumber)
            ?.setAttribute("aria-pressed", String(multiSelection.has(layerNumber)));
        }
        onHighlight(highlightedLayerNumber, highlightedLayerNumber !== null);
      };
      // `options.additive` (shift-click) adds/removes a layer from the
      // multi-selection without disturbing the rest of it; a plain click
      // replaces the whole multi-selection with just the toggled layer (or
      // clears it, matching the pre-existing single-select toggle behavior).
      const selectLayer = (layerNumber, options = {}) => {
        if (options.additive) {
          if (multiSelection.has(layerNumber)) {
            multiSelection.delete(layerNumber);
            if (selectedLayerNumber === layerNumber) {
              const remaining = [...multiSelection];
              selectedLayerNumber = remaining.length ? remaining[remaining.length - 1] : null;
            }
          } else {
            multiSelection.add(layerNumber);
            selectedLayerNumber = layerNumber;
          }
        } else {
          selectedLayerNumber = selectedLayerNumber === layerNumber ? null : layerNumber;
          multiSelection = new Set(selectedLayerNumber !== null ? [selectedLayerNumber] : []);
        }
        // Keep the combine checkboxes in sync with whatever is currently
        // (multi-)selected, so shift-clicking elements on the canvas or panel
        // checks their boxes without any extra step.
        selection.clear();
        for (const number of multiSelection) selection.add(number);
        syncSelection();
        onSelect?.(selectedLayerNumber);
        onMultiSelectChange?.([...multiSelection]);
        syncHighlight();
      };
      controller.setHoveredLayer = (layerNumber) => {
        hoveredLayerNumber = layerNumber;
        syncHighlight();
      };
      controller.clearHoveredLayer = (layerNumber) => {
        if (hoveredLayerNumber === layerNumber) hoveredLayerNumber = null;
        syncHighlight();
      };
      controller.selectLayer = selectLayer;
      controller.openEditor = (layerNumber) => layerEditButtons.get(layerNumber)?.click();
      controller.getSelectedLayer = () => selectedLayerNumber;
      controller.getMultiSelection = () => [...multiSelection];
      controller.syncGeometryInput = (layerNumber, name, value) => {
        const input = geometryInputs.get(`${layerNumber}:${name}`);
        if (input && input.value !== value) input.value = value;
      };
      controller.syncDimensionInputs = (layerNumber, values) => {
        for (const [name, value] of Object.entries(values)) {
          const input = geometryInputs.get(`${layerNumber}:${name}`);
          if (input && document.activeElement !== input) input.value = String(value);
        }
      };
      const layerByNumber = new Map(data.paintLayers.map((entry) => [entry.number, entry]));
      const layerRowController = createLayerRow({
        onRefresh,
        onHighlight,
        get hoveredLayerNumber() {
          return hoveredLayerNumber;
        },
        set hoveredLayerNumber(value) {
          hoveredLayerNumber = value;
        },
        syncHighlight,
        selectLayer,
        get focusedLayerNumber() {
          return focusedLayerNumber;
        },
        set focusedLayerNumber(value) {
          focusedLayerNumber = value;
        },
        selection,
        syncSelection,
        data,
        asset,
        layerItems,
        layerEdits,
        onEdit,
        geometryInputs,
        root,
        editorPanel,
        layerCheckboxes,
        layerEditButtons,
        layerButtons,
      });

      const groupTreeController = createGroupTree({
        asset,
        data,
        onEdit,
        actionsBar,
        addElement,
        layerByNumber,
        renderElementRow: layerRowController.renderElementRow,
      });
      groupTreeController.renderElementNodes(buildElementTree(data.svg), root);
      syncSelection();
      if (selectedLayerNumber !== null) {
        syncHighlight();
        layerItems.get(selectedLayerNumber)?.scrollIntoView({ block: "nearest" });
      }
      if (typeof lucide !== "undefined") lucide.createIcons();
    })
    .catch((error) => {
      console.error("Failed to render element editor", error);
      if (root.isConnected && root.dataset.assetId === asset.id)
        root.textContent = "Element information unavailable";
    });

  return controller;
}

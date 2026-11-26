import { collapsedGroupsForAsset } from "./actions.js";
import { assetGroupEdits, assetModified, assetPendingGroupFocus } from "../svg/editor-state.js";
import { applyAssetLayerEdits } from "../svg/apply-edits.js";
import { sanitizeSvgId } from "../svg/geometry.js";
import { collectElementNumbers } from "../svg/analysis.js";
import type { LayerBindings } from "../controller-types.js";

export function createGroupTree(
  context: Pick<
    LayerBindings,
    "asset" | "data" | "onEdit" | "actionsBar" | "addElement" | "layerByNumber" | "renderElementRow"
  >,
) {
  function renderElementNodes(nodes, container) {
    for (const node of [...nodes].reverse()) {
      if (node.type === "group") {
        const groupItem = document.createElement("li");
        groupItem.className = "asset-element-group";
        const header = document.createElement("div");
        header.className = "asset-element-group-header";
        const isCollapsed = collapsedGroupsForAsset(context.asset.id).has(node.element);
        const collapseButton = document.createElement("button");
        collapseButton.type = "button";
        collapseButton.className = "asset-element-group-collapse-button";
        collapseButton.setAttribute("aria-expanded", String(!isCollapsed));
        collapseButton.title = isCollapsed ? "Expand group" : "Collapse group";
        collapseButton.setAttribute("aria-label", isCollapsed ? "Expand group" : "Collapse group");
        collapseButton.innerHTML = `<i data-lucide="${isCollapsed ? "chevron-right" : "chevron-down"}" aria-hidden="true"></i>`;
        header.appendChild(collapseButton);
        const tag = document.createElement("code");
        tag.textContent = "<g>";
        header.appendChild(tag);
        const allGroups = Array.from(context.data.svg.querySelectorAll("g"));
        const groupKey = allGroups.indexOf(node.element) + 1;
        const groupEdit = groupKey
          ? assetGroupEdits.get(context.asset.id)?.get(groupKey) || {}
          : {};
        const groupOpacity = document.createElement("input");
        groupOpacity.type = "number";
        groupOpacity.min = "0";
        groupOpacity.max = "1";
        groupOpacity.step = "0.01";
        groupOpacity.value = String(groupEdit.opacity ?? node.element.getAttribute("opacity") ?? 1);
        groupOpacity.className = "asset-element-group-opacity";
        groupOpacity.setAttribute("aria-label", "Group opacity");
        groupOpacity.title = "Group opacity";
        groupOpacity.addEventListener("pointerdown", (event) => event.stopPropagation());
        groupOpacity.addEventListener("input", () => {
          const next = Number(groupOpacity.value);
          if (!Number.isFinite(next) || next < 0 || next > 1 || !groupKey) return;
          if (!assetGroupEdits.has(context.asset.id))
            assetGroupEdits.set(context.asset.id, new Map());
          assetGroupEdits.get(context.asset.id).set(groupKey, { opacity: next });
          assetModified.add(context.asset.id);
          const primaryGroup = document.querySelectorAll("#asset-primary-svg svg g")[groupKey - 1];
          if (primaryGroup) primaryGroup.setAttribute("opacity", String(next));
          applyAssetLayerEdits(document.querySelector("#asset-primary-svg svg"), context.asset.id);
          context.onEdit?.();
        });
        header.appendChild(groupOpacity);
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.className = "asset-element-group-name";
        nameInput.value = node.element.getAttribute("id") || "";
        nameInput.placeholder = "Unnamed group";
        nameInput.setAttribute("aria-label", "Group name");
        nameInput.title = "Group name (stored as this <g>'s id attribute)";
        nameInput.addEventListener("pointerdown", (event) => event.stopPropagation());
        nameInput.addEventListener("keydown", (event) => event.stopPropagation());
        nameInput.addEventListener("change", () => {
          const nextId = sanitizeSvgId(nameInput.value);
          if (nextId) node.element.setAttribute("id", nextId);
          else node.element.removeAttribute("id");
          nameInput.value = nextId;
        });
        header.appendChild(nameInput);
        const addToGroupButton = document.createElement("button");
        addToGroupButton.type = "button";
        addToGroupButton.className = "asset-element-group-add-button";
        addToGroupButton.title = "Add a new element inside this group";
        addToGroupButton.setAttribute("aria-label", "Add element to this group");
        addToGroupButton.innerHTML = '<i data-lucide="plus" aria-hidden="true"></i>';
        addToGroupButton.addEventListener("click", (event) => {
          event.stopPropagation();
          collapsedGroupsForAsset(context.asset.id).delete(node.element);
          const shape =
            context.actionsBar.querySelector(".asset-layer-add-button")?.dataset.shape || "rect";
          context.addElement(shape, node.element);
        });
        header.appendChild(addToGroupButton);
        const nestedList = document.createElement("ol");
        nestedList.className = "asset-element-group-children";
        nestedList.hidden = isCollapsed;
        groupItem.classList.toggle("is-collapsed", isCollapsed);
        collapseButton.addEventListener("click", (event) => {
          event.stopPropagation();
          const collapsedSet = collapsedGroupsForAsset(context.asset.id);
          const nowCollapsed = !collapsedSet.has(node.element);
          if (nowCollapsed) collapsedSet.add(node.element);
          else collapsedSet.delete(node.element);
          nestedList.hidden = nowCollapsed;
          groupItem.classList.toggle("is-collapsed", nowCollapsed);
          collapseButton.setAttribute("aria-expanded", String(!nowCollapsed));
          collapseButton.title = nowCollapsed ? "Expand group" : "Collapse group";
          collapseButton.setAttribute(
            "aria-label",
            nowCollapsed ? "Expand group" : "Collapse group",
          );
          collapseButton.innerHTML = `<i data-lucide="${nowCollapsed ? "chevron-right" : "chevron-down"}" aria-hidden="true"></i>`;
          if (typeof lucide !== "undefined") lucide.createIcons();
        });
        renderElementNodes(node.children, nestedList);
        groupItem.append(header, nestedList);
        container.appendChild(groupItem);

        const pendingFocus = assetPendingGroupFocus.get(context.asset.id);
        if (pendingFocus) {
          const groupNumbers = collectElementNumbers(node);
          if (
            groupNumbers.length === pendingFocus.size &&
            groupNumbers.every((number) => pendingFocus.has(number))
          ) {
            assetPendingGroupFocus.delete(context.asset.id);
            setTimeout(() => {
              nameInput.focus();
              nameInput.select();
            }, 0);
          }
        }
      } else {
        const layer = context.layerByNumber.get(node.number);
        if (layer) context.renderElementRow(layer, container);
      }
    }
  }
  return {
    renderElementNodes,
  };
}

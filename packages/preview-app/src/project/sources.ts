import { sourceRouteHref, resolveAssetPath, updateProjectFavoriteColor } from "./model.js";
import { showToast } from "../app-shell.js";
import type { ProjectSourceBindings } from "../controller-types.js";

export function renderProjectSources(
  context: Pick<
    ProjectSourceBindings,
    "steer" | "targetProject" | "applyFavoriteResult" | "sourcesGrid"
  >,
) {
  for (const source of context.steer.sources) {
    const card = document.createElement("article");
    card.className = "source-material-card";

    const titleEl = document.createElement("h5");
    titleEl.textContent = String(source.title || "Source Material");

    const kind = String(source.kind || "text").toLowerCase();

    if (kind === "image") {
      const sourceHref = sourceRouteHref(context.targetProject, source.src);
      const sourceDeepLink = new URL(sourceHref, window.location.href).href;
      const titleLink = document.createElement("a");
      titleLink.href = sourceHref;
      titleLink.textContent = titleEl.textContent;
      titleEl.replaceChildren(titleLink);
      const header = document.createElement("div");
      header.className = "source-material-header";
      const actions = document.createElement("div");
      actions.className = "source-material-actions";
      const linkButton = document.createElement("button");
      linkButton.type = "button";
      linkButton.className = "source-material-action";
      linkButton.setAttribute("aria-label", `Copy deep link for ${titleEl.textContent}`);
      linkButton.title = "Copy deep link";
      linkButton.innerHTML = '<i data-lucide="link" aria-hidden="true"></i>';
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "source-material-action";
      editButton.setAttribute("aria-label", `Rename ${titleEl.textContent}`);
      editButton.title = "Rename image";
      editButton.innerHTML = '<i data-lucide="pencil" aria-hidden="true"></i>';
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "source-material-action source-material-delete";
      deleteButton.setAttribute("aria-label", `Remove ${titleEl.textContent}`);
      deleteButton.title = "Remove image";
      deleteButton.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>';
      actions.append(linkButton, editButton, deleteButton);
      header.append(titleEl, actions);
      card.appendChild(header);

      const img = document.createElement("img");
      img.className = "source-material-image";
      img.src = resolveAssetPath(source.src || source.url || "");
      img.alt = String(source.alt || source.title || "Source image");
      const imageLink = document.createElement("a");
      imageLink.className = "source-material-image-link";
      imageLink.href = sourceHref;
      imageLink.setAttribute("aria-label", `Open ${titleEl.textContent} source page`);
      imageLink.appendChild(img);
      card.appendChild(imageLink);

      const palette = Array.isArray(source.palette) ? source.palette.slice(0, 10) : [];
      if (palette.length) {
        const paletteRegion = document.createElement("div");
        paletteRegion.className = "source-material-palette";
        const paletteLabel = document.createElement("p");
        paletteLabel.className = "source-material-palette-label";
        paletteLabel.textContent = "Project favorites";
        const swatches = document.createElement("div");
        swatches.className = "source-material-swatches";

        for (const entry of palette) {
          const color = String(entry.hex || "").toUpperCase();
          if (!/^#[0-9A-F]{6}$/.test(color)) continue;
          const percentage = Number(entry.percentage || 0);
          const selected = context.steer.favoriteColors.includes(color);
          const swatch = document.createElement("button");
          swatch.type = "button";
          swatch.className = "source-material-swatch";
          swatch.dataset.color = color;
          swatch.style.setProperty("--swatch-color", color);
          swatch.setAttribute("aria-pressed", String(selected));
          swatch.setAttribute(
            "aria-label",
            `${selected ? "Remove" : "Select"} ${color} as a project favorite; ${percentage}% of image`,
          );
          swatch.title = color;
          swatch.innerHTML = '<i data-lucide="check" aria-hidden="true"></i>';
          swatch.addEventListener("click", async () => {
            const shouldSelect = swatch.getAttribute("aria-pressed") !== "true";
            swatch.disabled = true;
            try {
              const result = await updateProjectFavoriteColor(
                context.targetProject,
                color,
                shouldSelect,
              );
              context.applyFavoriteResult(result, color);
              showToast(
                shouldSelect
                  ? `${color} added to project favorites.`
                  : `${color} removed from project favorites.`,
              );
            } catch (error) {
              showToast(error.message);
            } finally {
              swatch.disabled = false;
            }
          });
          swatches.appendChild(swatch);
        }

        paletteRegion.append(paletteLabel, swatches);
        card.appendChild(paletteRegion);
      }

      const editor = document.createElement("form");
      editor.className = "source-material-editor";
      editor.hidden = true;
      const input = document.createElement("input");
      input.className = "wm-input source-material-name-input";
      input.value = String(source.title || "");
      input.setAttribute("aria-label", "Image name");
      const save = document.createElement("button");
      save.type = "submit";
      save.className = "btn btn-primary btn-sm";
      save.textContent = "Save";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "btn btn-sm";
      cancel.textContent = "Cancel";
      const status = document.createElement("p");
      status.className = "source-material-status";
      status.setAttribute("aria-live", "polite");
      editor.append(input, save, cancel);
      card.append(editor, status);

      const mutateSource = async (action, filename) => {
        const response = await fetch("/~grounding-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project: context.targetProject,
            source: source.src,
            action,
            filename,
          }),
        });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || "Image update failed");
        window.location.reload();
      };

      editButton.addEventListener("click", () => {
        editor.hidden = false;
        input.focus();
        input.select();
      });
      cancel.addEventListener("click", () => {
        editor.hidden = true;
        status.textContent = "";
      });
      linkButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(sourceDeepLink);
          status.textContent = "";
          showToast("Link copied.");
        } catch {
          status.textContent = "Copy failed. Open the image and copy its URL manually.";
        }
      });
      editor.addEventListener("submit", async (event) => {
        event.preventDefault();
        status.textContent = "Renaming...";
        try {
          await mutateSource("rename", input.value);
        } catch (error) {
          status.textContent = error.message;
        }
      });
      deleteButton.addEventListener("click", async () => {
        if (deleteButton.dataset.confirm !== "true") {
          deleteButton.dataset.confirm = "true";
          deleteButton.classList.add("is-confirming");
          deleteButton.setAttribute("aria-label", `Confirm removal of ${titleEl.textContent}`);
          deleteButton.title = "Click again to confirm removal";
          window.setTimeout(() => {
            deleteButton.dataset.confirm = "false";
            deleteButton.classList.remove("is-confirming");
            deleteButton.setAttribute("aria-label", `Remove ${titleEl.textContent}`);
            deleteButton.title = "Remove image";
          }, 4000);
          return;
        }
        deleteButton.disabled = true;
        try {
          await mutateSource("delete");
        } catch (error) {
          deleteButton.disabled = false;
          status.textContent = error.message;
        }
      });
    } else if (kind === "url") {
      card.appendChild(titleEl);
      const link = document.createElement("a");
      link.href = String(source.url || "");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = String(source.url || "Open URL");
      card.appendChild(link);
    } else if (kind === "file") {
      card.appendChild(titleEl);
      const link = document.createElement("a");
      link.href = resolveAssetPath(source.path || source.url || "");
      link.textContent = String(source.path || source.url || "Open file");
      card.appendChild(link);
    } else {
      card.appendChild(titleEl);
      const body = document.createElement("p");
      body.textContent = String(source.text || "");
      card.appendChild(body);
    }

    context.sourcesGrid.appendChild(card);
  }
}

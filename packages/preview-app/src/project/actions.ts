import { appState } from "../app-state.js";
import { projectRouteHref } from "./model.js";
import { getRouteFromHash } from "../app-shell.js";

export function renderActiveProjectPrompt() {
  const prompt = document.getElementById("project-sample-prompt");
  const count = document.getElementById("project-prompt-count");
  const previous = document.getElementById("project-prompt-previous");
  const next = document.getElementById("project-prompt-next");
  if (!prompt || !count || !previous || !next) return;

  prompt.textContent = appState.projectSamplePrompts[appState.activeProjectPromptIndex] || "";
  count.textContent = appState.projectSamplePrompts.length
    ? `${appState.activeProjectPromptIndex + 1} of ${appState.projectSamplePrompts.length}`
    : "0 of 0";
  const hasMultiplePrompts = appState.projectSamplePrompts.length > 1;
  previous.disabled = !hasMultiplePrompts;
  next.disabled = !hasMultiplePrompts;
}

export function wireGenerateAssetPrompt() {
  const button = document.getElementById("project-generate-new");
  const panel = document.getElementById("project-generate-panel");
  const copyButton = document.getElementById("project-prompt-copy");
  if (!button || !panel || !copyButton) return;

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const section = button.closest(".project-assets-section-shell")?.querySelector("details");
    const wasSectionOpen = section?.open ?? true;
    if (section) section.open = true;
    if (wasSectionOpen || panel.hidden) panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) copyButton.focus();
  });
}

export function wireProjectRename() {
  const button = document.getElementById("project-rename-button");
  const form = document.getElementById("project-rename-form");
  const input = document.getElementById("project-rename-input");
  const cancel = document.getElementById("project-rename-cancel");
  const status = document.getElementById("project-rename-status");
  if (!button || !form || !input || !cancel || !status) return;

  button.addEventListener("click", () => {
    form.hidden = false;
    input.focus();
    input.select();
  });
  cancel.addEventListener("click", () => {
    form.hidden = true;
    status.textContent = "";
    input.value = form.dataset.project || "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nextName = input.value.trim();
    status.textContent = "Renaming...";
    try {
      const response = await fetch("/~project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: form.dataset.project, name: nextName }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Project rename failed");
      window.location.hash = projectRouteHref(result.name).slice(1);
      window.location.reload();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

export function wireProjectPromptCarousel() {
  const previous = document.getElementById("project-prompt-previous");
  const next = document.getElementById("project-prompt-next");
  const copy = document.getElementById("project-prompt-copy");
  const status = document.getElementById("project-prompt-copy-status");
  if (!previous || !next || !copy || !status) return;

  const move = (offset) => {
    if (!appState.projectSamplePrompts.length) return;
    appState.activeProjectPromptIndex =
      (appState.activeProjectPromptIndex + offset + appState.projectSamplePrompts.length) %
      appState.projectSamplePrompts.length;
    status.textContent = "";
    renderActiveProjectPrompt();
  };

  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(
        appState.projectSamplePrompts[appState.activeProjectPromptIndex] || "",
      );
      status.textContent = "Prompt copied.";
    } catch {
      status.textContent = "Copy failed. Select the prompt and copy it manually.";
    }
  });
}

export function wireSourceReferenceCopy() {
  const button = document.getElementById("source-copy-reference");
  const reference = document.getElementById("source-prompt-reference");
  const status = document.getElementById("source-copy-status");
  if (!button || !reference || !status) return;

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(reference.textContent || "");
      status.textContent = "Reference copied.";
    } catch {
      status.textContent = "Copy failed. Select the reference and copy it manually.";
    }
  });
}

export function wireGroundingDropZone() {
  const dropzone = document.getElementById("project-grounding-dropzone");
  const input = document.getElementById("project-grounding-input");
  const status = document.getElementById("project-grounding-status");
  if (!dropzone || !input || !status) return;

  const uploadFiles = async (files) => {
    const project = getRouteFromHash().projectName;
    if (!project || files.length === 0) return;
    status.textContent = `Uploading ${files.length} image${files.length === 1 ? "" : "s"}...`;

    try {
      for (const file of files) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error || new Error("Could not read image"));
          reader.readAsDataURL(file);
        });
        const response = await fetch("/~grounding-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project, filename: file.name, dataUrl }),
        });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || "Upload failed");
      }
      status.textContent = "Steering source material uploaded. Refreshing project sources...";
      window.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      status.textContent = error.message;
    }
  };

  input.addEventListener("change", () => uploadFiles(Array.from(input.files || [])));
  for (const eventName of ["dragenter", "dragover"]) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  }
  dropzone.addEventListener("drop", (event) =>
    uploadFiles(Array.from(event.dataTransfer?.files || [])),
  );
}

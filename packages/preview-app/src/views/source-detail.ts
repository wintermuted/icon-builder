import { appState } from "../app-state.js";
import { projectRouteHref, resolveAssetPath } from "../project/model.js";

export function renderSourceDetail(projectName, sourcePath) {
  const title = document.getElementById("source-detail-title");
  const meta = document.getElementById("source-detail-meta");
  const projectLink = document.getElementById("source-project-link");
  const deepLink = document.getElementById("source-deep-link");
  const image = document.getElementById("source-detail-image");
  const reference = document.getElementById("source-prompt-reference");
  const copyStatus = document.getElementById("source-copy-status");
  if (!title || !meta || !projectLink || !deepLink || !image || !reference || !copyStatus) return;

  const projectMeta = appState.projectMetaByName.get(projectName);
  const source = projectMeta?.agentSteer?.sources?.find(
    (item) => item.kind === "image" && item.src === sourcePath,
  );
  projectLink.href = projectRouteHref(projectName);
  projectLink.textContent = `Back to ${projectName}`;
  copyStatus.textContent = "";

  if (!source) {
    title.textContent = "Source image not found";
    meta.textContent = "This source may have been renamed or removed.";
    image.hidden = true;
    reference.textContent = window.location.href;
    deepLink.href = window.location.href;
    return;
  }

  title.textContent = String(source.title || "Source Image");
  meta.textContent = `${projectName} · ${source.src}`;
  image.hidden = false;
  image.src = resolveAssetPath(source.src);
  image.alt = String(source.alt || source.title || "Steering source image");
  deepLink.href = window.location.href;
  deepLink.setAttribute("aria-label", `${source.title || "Source image"} deep link`);
  reference.textContent = `Steering source: ${window.location.href}\nRepository file: ${source.src}`;
}

export async function loadJson(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
}

export type Route =
  | { tab: "logos"; page: "asset"; assetId: string }
  | { tab: "logos"; page: "project"; projectName: string }
  | { tab: "logos"; page: "source"; projectName: string; sourcePath: string }
  | { tab: "logos" | "diagrams"; page: "collection" };

export function getRouteFromHash(): Route {
  const token = (window.location.hash || "#logos").replace(/^#/, "");
  if (token.startsWith("asset/"))
    return { tab: "logos", page: "asset", assetId: decodeHashSegment(token.slice(6).trim()) };
  if (token.startsWith("project/"))
    return { tab: "logos", page: "project", projectName: decodeHashSegment(token.slice(8).trim()) };
  if (token.startsWith("source/")) {
    const [project = "", source = ""] = token.slice(7).split("/");
    return {
      tab: "logos",
      page: "source",
      projectName: decodeHashSegment(project),
      sourcePath: decodeHashSegment(source),
    };
  }
  return { tab: token === "diagrams" ? "diagrams" : "logos", page: "collection" };
}

export function applyThemeFromQuery() {
  if (new URLSearchParams(location.search).get("canvas") === "1") return;
  const theme =
    new URLSearchParams(window.location.search).get("theme") ||
    localStorage.getItem("wm-assets-theme");
  if (theme === "light" || theme === "dark")
    document.documentElement.setAttribute("data-theme", theme);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeProjectPrompt(prompt: string, projectName: string, projectSlug: string) {
  const fields = `Project: ${projectName}\nDirectory: assets/svg/${projectSlug}/`;
  const content = prompt
    .replace(/^Project:.*(?:\r?\n)?/gm, "")
    .replace(/^Directory:.*(?:\r?\n)?/gm, "")
    .trimEnd();
  return content ? `${content}\n\n${fields}` : fields;
}

export function showToast(message: string) {
  window.dispatchEvent(new CustomEvent("preview-toast", { detail: message }));
}

function decodeHashSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

import { appState } from "./app-state.js";
import {
  assetModified,
  assetSvgDataCache,
  assetLayerEdits,
  assetViewBoxEdits,
  assetAccessibilityEdits,
  assetSourceSizeEdits,
  assetGroupEdits,
} from "./svg/editor-state.js";

export const isCopilotCanvas = new URLSearchParams(location.search).get("canvas") === "1";
const token = new URLSearchParams(location.search).get("panel") || "";
const sources = new Map<string, string>();
const revisions = new Map<string, string>();
let activeId = "";
let frozen = true;
let connected = false;
let draftFailure = "";
let saving = false;
let pendingDraft: Promise<void> = Promise.resolve();
let notice: HTMLElement;

function status(message: string, error = false) {
  if (!notice) return;
  notice.textContent = message;
  notice.setAttribute("role", error ? "alert" : "status");
}

function freeze(value: boolean) {
  frozen = value;
  const root = document.getElementById("root");
  if (root) root.inert = value;
}

async function request(path: string, input?: object) {
  const response = await fetch(
    path,
    input
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : undefined,
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Canvas request failed (${response.status}).`);
  return result;
}

export function canvasSource(source: string) {
  return isCopilotCanvas ? sources.get(source) : undefined;
}

function snapshot() {
  if (saving) return;
  const svg = document.querySelector("#asset-primary-svg svg");
  const owner = document.getElementById("asset-primary-svg")?.dataset.assetId;
  if (!svg || !activeId || owner !== activeId || !assetModified.has(activeId)) return;
  const input = {
    id: activeId,
    svg: new XMLSerializer().serializeToString(svg),
    revision: revisions.get(activeId),
  };
  pendingDraft = pendingDraft
    .then(async () => {
      await request("/~canvas/draft", input);
      draftFailure = "";
      if (activeId === input.id && !saving)
        status("Unsaved changes preserved. Save or discard before agent writes.");
    })
    .catch((error) => {
      draftFailure = error.message;
      status(`Draft could not be preserved: ${error.message}. Keep this panel open.`, true);
    });
}

export async function prepareCanvasAsset(id: string) {
  if (!isCopilotCanvas) return;
  snapshot();
  await pendingDraft;
  if (draftFailure) throw new Error(draftFailure);
  const data = await request(`/~canvas/asset?id=${encodeURIComponent(id)}`);
  activeId = id;
  revisions.set(id, data.draft?.revision ?? data.revision);
  sources.set(data.asset.source, data.draft?.svg ?? data.svg);
  assetSvgDataCache.delete(data.asset.source);
  assetLayerEdits.delete(id);
  assetViewBoxEdits.delete(id);
  assetAccessibilityEdits.delete(id);
  assetSourceSizeEdits.delete(id);
  assetGroupEdits.delete(id);
  if (data.draft) {
    assetModified.add(id);
    status(
      data.draft.revision === data.revision
        ? "Recovered unsaved changes. Save or discard before agent writes."
        : "Recovered draft conflicts with disk changes. Copy the draft before discarding it.",
      true,
    );
  } else {
    assetModified.delete(id);
    status("Connected to Copilot canvas.");
  }
}

export function releaseCanvasAsset() {
  if (!isCopilotCanvas) return;
  snapshot();
  const id = activeId;
  if (id)
    pendingDraft = pendingDraft
      .then(async () => {
        await request("/~canvas/release", { id });
      })
      .catch((error) => {
        draftFailure = error.message;
        status(error.message, true);
      });
  activeId = "";
}

export async function saveCanvasAsset(id: string, svg: string) {
  snapshot();
  await pendingDraft;
  if (draftFailure) throw new Error(draftFailure);
  saving = true;
  try {
    const result = await request("/~asset", { id, svg, expectedRevision: revisions.get(id) });
    revisions.set(id, result.revision);
    sources.set(appState.assetById.get(id).source, svg);
    return result;
  } finally {
    saving = false;
  }
}

export async function discardCanvasDraft() {
  if (!activeId) return;
  await pendingDraft;
  await request("/~canvas/draft", { id: activeId, discard: true });
  assetModified.delete(activeId);
  location.reload();
}

export function initializeCopilotCanvas() {
  if (!isCopilotCanvas) return;
  document.documentElement.dataset.copilotCanvas = "true";
  notice = document.createElement("aside");
  notice.className = "copilot-canvas-status";
  document.body.append(notice);
  status("Connecting to Icon Builder...");
  freeze(true);
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (url.origin === location.origin && url.pathname.startsWith("/~")) {
      const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
      headers.set("x-icon-canvas-token", token);
      return nativeFetch(input, { ...init, headers });
    }
    return nativeFetch(input, init);
  };
  const applyTheme = () => {
    const mode = document.documentElement.dataset.colorMode;
    const dark =
      mode === "dark" || (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    window.dispatchEvent(new Event("canvas-theme"));
  };
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-color-mode", "data-dark-theme", "data-light-theme"],
  });
  applyTheme();
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      snapshot();
    });
  };
  new MutationObserver(schedule).observe(document.getElementById("root"), {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  window.addEventListener("canvas-dirty", schedule);
  window.addEventListener("beforeunload", (event) => {
    if (assetModified.size) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  const events = new EventSource(`/~canvas/events?panel=${encodeURIComponent(token)}`);
  events.onerror = () => {
    connected = false;
    freeze(true);
    status("Canvas disconnected. Reopen it from Copilot; saved drafts will be recovered.", true);
  };
  events.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "connected") {
      connected = true;
      freeze(false);
      status("Connected to Copilot canvas.");
    } else if (data.type === "prepare") {
      freeze(true);
      snapshot();
      void pendingDraft
        .then(async () => {
          await request("/~canvas/ack", {
            id: data.id,
            clean: !draftFailure && (data.saving || assetModified.size === 0),
          });
        })
        .catch((error) => status(error.message, true));
    } else if (data.type === "release") {
      freeze(!connected);
      if (data.changed && !data.saving && !assetModified.size) location.reload();
    }
  };
  document.addEventListener(
    "keydown",
    (event) => {
      if (frozen) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

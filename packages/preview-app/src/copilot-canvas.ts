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
let preparing = false;
let writingDraft: Promise<void> | undefined;
type Draft = { id: string; svg: string; revision: string | undefined };
let queuedDraft: Draft | undefined;
let lastSnapshot: Draft | undefined;
let assetVersion = 0;
let assetQueue: Promise<unknown> = Promise.resolve();
let notice: HTMLElement;
let statusText: HTMLElement;
let recovery: HTMLButtonElement;

function status(message: string, error = false) {
  if (!notice) return;
  statusText.textContent = message;
  statusText.setAttribute("role", error ? "alert" : "status");
  recovery.hidden = connected || !document.querySelector("#asset-primary-svg svg");
}

function freeze(value: boolean) {
  frozen = value;
  const root = document.getElementById("root");
  if (root) root.inert = value;
  for (const dialog of document.querySelectorAll<HTMLElement>("dialog, [role='dialog']"))
    dialog.inert = value;
}

function syncFreeze() {
  freeze(!connected || preparing || saving);
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
  if (
    lastSnapshot?.id === input.id &&
    lastSnapshot.svg === input.svg &&
    lastSnapshot.revision === input.revision
  )
    return;
  lastSnapshot = input;
  queuedDraft = input;
  if (!writingDraft) startDraftWrite();
}

function startDraftWrite() {
  writingDraft = writeDrafts().finally(() => {
    writingDraft = undefined;
    if (queuedDraft) startDraftWrite();
  });
}

async function writeDrafts() {
  while (queuedDraft) {
    const input = queuedDraft;
    queuedDraft = undefined;
    try {
      await request("/~canvas/draft", input);
      draftFailure = "";
      if (activeId === input.id && !saving)
        status("Unsaved changes preserved. Save or discard before agent writes.");
    } catch (error) {
      lastSnapshot = undefined;
      draftFailure = error.message;
      status(`Draft could not be preserved: ${error.message}. Keep this panel open.`, true);
    }
  }
}

async function flushDrafts() {
  while (writingDraft) await writingDraft;
}

function queueAsset<T>(work: () => Promise<T>) {
  const next = assetQueue.then(work);
  assetQueue = next.catch(() => {});
  return next;
}

export async function prepareCanvasAsset(id: string) {
  if (!isCopilotCanvas) return true;
  const version = ++assetVersion;
  snapshot();
  return queueAsset(async () => {
    await flushDrafts();
    if (draftFailure) throw new Error(draftFailure);
    if (version !== assetVersion) return false;
    const data = await request(`/~canvas/asset?id=${encodeURIComponent(id)}`);
    if (version !== assetVersion) {
      await request("/~canvas/release", { id });
      return false;
    }
    activeId = id;
    lastSnapshot = undefined;
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
    return true;
  });
}

export function releaseCanvasAsset() {
  if (!isCopilotCanvas) return;
  snapshot();
  const id = activeId;
  ++assetVersion;
  activeId = "";
  void queueAsset(async () => {
    await flushDrafts();
    if (id) await request("/~canvas/release", { id });
  }).catch((error) => {
    draftFailure = error.message;
    status(error.message, true);
  });
}

export async function saveCanvasAsset(
  id: string,
  serialize: () => string,
  onSaved: (result: { source: string; revision: string }) => void,
) {
  if (saving || preparing || !connected)
    throw new Error("Wait for the canvas to reconnect or finish writing.");
  freeze(true);
  snapshot();
  saving = true;
  try {
    const svg = serialize();
    await flushDrafts();
    if (draftFailure) throw new Error(draftFailure);
    const result = await request("/~asset", { id, svg, expectedRevision: revisions.get(id) });
    revisions.set(id, result.revision);
    sources.set(appState.assetById.get(id).source, svg);
    onSaved(result);
    lastSnapshot = undefined;
    return result;
  } finally {
    saving = false;
    syncFreeze();
  }
}

export async function discardCanvasDraft() {
  if (!activeId) return;
  await flushDrafts();
  await request("/~canvas/draft", { id: activeId, discard: true });
  assetModified.delete(activeId);
  location.reload();
}

export function initializeCopilotCanvas() {
  if (!isCopilotCanvas) return;
  document.documentElement.dataset.copilotCanvas = "true";
  notice = document.createElement("aside");
  notice.className = "copilot-canvas-status";
  statusText = document.createElement("span");
  recovery = document.createElement("button");
  recovery.type = "button";
  recovery.className = "btn btn-sm";
  recovery.textContent = "Copy recovery SVG";
  recovery.onclick = () => {
    const svg = document.querySelector("#asset-primary-svg svg");
    if (!svg) return status("No SVG is available to copy.", true);
    void navigator.clipboard
      .writeText(new XMLSerializer().serializeToString(svg))
      .then(() => status("Copied the in-memory SVG. Keep it safe before reopening the canvas."))
      .catch((error) => status(`Could not copy recovery SVG: ${error.message}`, true));
  };
  notice.append(statusText, recovery);
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
  new MutationObserver((records) => {
    const preview = document.getElementById("asset-primary-svg");
    if (records.some((record) => preview?.contains(record.target))) schedule();
  }).observe(document.getElementById("root"), {
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
    status(
      "Canvas disconnected. Copy recovery SVG before reopening if edits were not preserved.",
      true,
    );
  };
  events.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "connected") {
      connected = true;
      preparing = data.preparing === true;
      syncFreeze();
      status("Connected to Copilot canvas.");
    } else if (data.type === "prepare") {
      preparing = true;
      syncFreeze();
      snapshot();
      void flushDrafts()
        .then(async () => {
          await request("/~canvas/ack", {
            id: data.id,
            clean: !draftFailure && (data.saving || assetModified.size === 0),
          });
        })
        .catch((error) => status(error.message, true));
    } else if (data.type === "release") {
      preparing = false;
      syncFreeze();
      if (data.changed && !data.requesting && !data.saving && !assetModified.size)
        location.reload();
    }
  };
  document.addEventListener(
    "keydown",
    (event) => {
      if (frozen) {
        event.stopImmediatePropagation();
        if (document.getElementById("root")?.contains(event.target as Node)) event.preventDefault();
      }
    },
    true,
  );
}

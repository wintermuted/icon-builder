import { useState } from "react";
import { appState } from "../app-state.js";
import { projectRouteHref, resolveAssetPath } from "../project/model.js";
import { Icon } from "@wm-asset-workflows/ui-components";

export function SourcePage({
  projectName,
  sourcePath,
}: {
  projectName: string;
  sourcePath: string;
}) {
  const [status, setStatus] = useState("");
  const source = appState.projectMetaByName
    .get(projectName)
    ?.agentSteer?.sources?.find((item) => item.kind === "image" && item.src === sourcePath);
  const reference = source
    ? `Steering source: ${window.location.href}\nRepository file: ${source.src}`
    : window.location.href;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setStatus("Reference copied.");
    } catch {
      setStatus("Copy failed. Select the reference and copy it manually.");
    }
  };
  return (
    <section id="source-detail" className="source-detail-page">
      <header className="project-detail-header">
        <a
          id="source-project-link"
          href={projectRouteHref(projectName)}
          className="asset-back-link"
        >
          Back to {projectName}
        </a>
        <div className="project-detail-title-row">
          <h3 id="source-detail-title">
            {source ? source.title || "Source Image" : "Source image not found"}
          </h3>
          <a
            id="source-deep-link"
            className="project-deep-link"
            href={window.location.href}
            title="Source image deep link"
            aria-label={`${source?.title || "Source image"} deep link`}
          >
            <Icon name="Link" />
          </a>
        </div>
        <p id="source-detail-meta" className="asset-detail-meta">
          {source
            ? `${projectName} · ${source.src}`
            : "This source may have been renamed or removed."}
        </p>
      </header>
      <div className="source-detail-layout">
        <div className="source-detail-preview">
          {source && (
            <img
              id="source-detail-image"
              src={resolveAssetPath(source.src)}
              alt={source.alt || source.title || "Steering source image"}
            />
          )}
        </div>
        <div className="source-detail-reference">
          <h4>Prompt Reference</h4>
          <p>Use this reference when asking an agent to inspect or build from this image.</p>
          <pre id="source-prompt-reference">{reference}</pre>
          <button id="source-copy-reference" type="button" className="btn btn-sm" onClick={copy}>
            <Icon name="Copy" />
            Copy Reference
          </button>
          <p id="source-copy-status" className="project-copy-status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>
    </section>
  );
}

import { useState } from "react";
import { appState } from "../app-state.js";
import { projectRouteHref, resolveAssetPath } from "../project/model.js";
import {
  CodeBlock,
  Icon,
  PageHeader,
  PreviewSurface,
  SplitLayout,
  StatusMessage,
} from "@wm-asset-workflows/ui-components";

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
      <PageHeader
        className="project-detail-header"
        titleRowClassName="project-detail-title-row"
        title={source ? source.title || "Source Image" : "Source image not found"}
        titleId="source-detail-title"
        navigation={
          <a
            id="source-project-link"
            href={projectRouteHref(projectName)}
            className="asset-back-link"
          >
            Back to {projectName}
          </a>
        }
        actions={
          <a
            id="source-deep-link"
            className="project-deep-link"
            href={window.location.href}
            title="Source image deep link"
            aria-label={`${source?.title || "Source image"} deep link`}
          >
            <Icon name="Link" />
          </a>
        }
        meta={
          <p id="source-detail-meta" className="asset-detail-meta">
            {source
              ? `${projectName} · ${source.src}`
              : "This source may have been renamed or removed."}
          </p>
        }
      />
      <SplitLayout
        className="source-detail-layout"
        primarySize="1.4fr"
        secondarySize="0.8fr"
        secondaryMinWidth="260px"
      >
        <PreviewSurface
          className="source-detail-preview"
          maxImageHeight="70vh"
          imageWidth="100%"
          style={{ minHeight: 0 }}
        >
          {source && (
            <img
              id="source-detail-image"
              src={resolveAssetPath(source.src)}
              alt={source.alt || source.title || "Steering source image"}
            />
          )}
        </PreviewSurface>
        <div className="source-detail-reference">
          <h4>Prompt Reference</h4>
          <p>Use this reference when asking an agent to inspect or build from this image.</p>
          <CodeBlock id="source-prompt-reference">{reference}</CodeBlock>
          <button id="source-copy-reference" type="button" className="btn btn-sm" onClick={copy}>
            <Icon name="Copy" />
            Copy Reference
          </button>
          <StatusMessage id="source-copy-status" className="project-copy-status">
            {status}
          </StatusMessage>
        </div>
      </SplitLayout>
    </section>
  );
}

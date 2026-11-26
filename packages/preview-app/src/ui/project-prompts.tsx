import { useRef, useState } from "react";
import { normalizeProjectPrompt, slugify } from "../app-shell.js";
import { resolveAssetPath } from "../project/model.js";
import { Icon } from "./icon.js";
import type { Project, Asset } from "../types.js";
import { AssetCard } from "./collection.js";

export function ProjectAssets({ project, assets }: { project: Project; assets: Asset[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");
  const details = useRef<HTMLDetailsElement>(null);
  const copyButton = useRef<HTMLButtonElement>(null);
  const slug = project.slug || slugify(project.name);
  const defaults = [
    "/create-svg-asset",
    "/create-svg-asset\n\nCreate a minimal geometric mark using the uploaded steering source material.\nBase idea: combine a strong silhouette with one distinctive cutout or negative-space detail.",
    "/create-svg-asset\n\nCreate an expressive symbol using the uploaded steering source material.\nBase idea: translate the project's core purpose into a modular emblem that remains recognizable at favicon size.",
  ];
  const prompts = (project.samplePrompts?.length ? project.samplePrompts : defaults).map((prompt) =>
    normalizeProjectPrompt(prompt, project.name, slug),
  );
  const docs = [
    [project.documentation || `assets/svg/${slug}/README.md`, "Project README"],
    [".github/prompts/create-svg-asset.prompt.md", "Create SVG Asset prompt"],
    [".github/skills/wm-asset-manifest-spec/SKILL.md", "Manifest specification"],
    [".github/skills/wm-asset-authoring-workflow/SKILL.md", "Authoring workflow"],
  ];
  const move = (offset: number) => {
    setIndex((index + offset + prompts.length) % prompts.length);
    setStatus("");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompts[index]);
      setStatus("Prompt copied.");
    } catch {
      setStatus("Copy failed. Select the prompt and copy it manually.");
    }
  };
  return (
    <div className="project-assets-section-shell">
      <details ref={details} className="project-assets-section project-collapsible-card" open>
        <summary>
          <h4 id="project-assets-heading">Generated Assets</h4>
          <Icon name="ChevronDown" />
        </summary>
        <div className="project-collapsible-body" aria-labelledby="project-assets-heading">
          <div id="project-generate-panel" className="project-generate-panel" hidden={!open}>
            <div className="project-guidance-grid">
              <div>
                <h5 id="project-prompts-heading">Sample Prompts</h5>
                <div id="project-sample-prompts" className="project-sample-prompts">
                  <pre id="project-sample-prompt" className="project-prompt-sample">
                    {prompts[index]}
                  </pre>
                  <div className="project-prompt-controls">
                    <div className="project-prompt-navigation">
                      <button
                        id="project-prompt-previous"
                        type="button"
                        className="btn btn-sm"
                        aria-label="Previous sample prompt"
                        title="Previous sample prompt"
                        disabled={prompts.length < 2}
                        onClick={() => move(-1)}
                      >
                        <Icon name="ArrowLeft" />
                      </button>
                      <span
                        id="project-prompt-count"
                        className="project-prompt-count"
                        aria-live="polite"
                      >
                        {index + 1} of {prompts.length}
                      </span>
                      <button
                        id="project-prompt-next"
                        type="button"
                        className="btn btn-sm"
                        aria-label="Next sample prompt"
                        title="Next sample prompt"
                        disabled={prompts.length < 2}
                        onClick={() => move(1)}
                      >
                        <Icon name="ArrowRight" />
                      </button>
                    </div>
                    <button
                      ref={copyButton}
                      id="project-prompt-copy"
                      type="button"
                      className="btn btn-sm"
                      onClick={copy}
                    >
                      <Icon name="Copy" />
                      Copy Prompt
                    </button>
                  </div>
                  <p
                    id="project-prompt-copy-status"
                    className="project-prompt-copy-status"
                    aria-live="polite"
                  >
                    {status}
                  </p>
                </div>
              </div>
              <div>
                <h5>Documentation</h5>
                <ul id="project-documentation-links" className="project-documentation-links">
                  {docs.map(([path, label]) => (
                    <li key={path}>
                      <a href={resolveAssetPath(path)} target="_blank" rel="noopener noreferrer">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div id="project-asset-grid" className="asset-grid">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>
      </details>
      <button
        id="project-generate-new"
        type="button"
        className="project-assets-header-action btn btn-primary btn-sm"
        aria-expanded={open}
        aria-controls="project-generate-panel"
        onClick={() => {
          const wasOpen = details.current?.open ?? true;
          if (details.current) details.current.open = true;
          if (wasOpen || !open) setOpen(!open);
          if (!open) window.requestAnimationFrame(() => copyButton.current?.focus());
        }}
      >
        <Icon name="Sparkles" />
        Generate New
      </button>
    </div>
  );
}

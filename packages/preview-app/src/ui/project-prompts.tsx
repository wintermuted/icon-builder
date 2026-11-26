import { useRef, useState } from "react";
import { normalizeProjectPrompt, slugify } from "../app-shell.js";
import { resolveAssetPath } from "../project/model.js";
import {
  Icon,
  PromptCarousel,
  ResourceLinkList,
  ResponsiveGrid,
  SplitLayout,
} from "@wm-asset-workflows/ui-components";
import type { Project, Asset } from "../types.js";
import { AssetCard } from "./collection.js";

export function ProjectAssets({ project, assets }: { project: Project; assets: Asset[] }) {
  const [open, setOpen] = useState(false);
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
  return (
    <div className="project-assets-section-shell">
      <details ref={details} className="project-assets-section project-collapsible-card" open>
        <summary>
          <h4 id="project-assets-heading">Generated Assets</h4>
          <Icon name="ChevronDown" />
        </summary>
        <div className="project-collapsible-body" aria-labelledby="project-assets-heading">
          <div id="project-generate-panel" className="project-generate-panel" hidden={!open}>
            <SplitLayout
              className="project-guidance-grid"
              primarySize="1.5fr"
              secondaryMinWidth="190px"
              collapseAt="compact"
            >
              <div>
                <h5 id="project-prompts-heading">Sample Prompts</h5>
                <PromptCarousel idPrefix="project" prompts={prompts} copyButtonRef={copyButton} />
              </div>
              <div>
                <h5>Documentation</h5>
                <ResourceLinkList
                  id="project-documentation-links"
                  className="project-documentation-links"
                  items={docs.map(([path, label]) => ({
                    href: resolveAssetPath(path),
                    label,
                    external: true,
                  }))}
                />
              </div>
            </SplitLayout>
          </div>
          <ResponsiveGrid id="project-asset-grid" className="asset-grid">
            {assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </ResponsiveGrid>
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

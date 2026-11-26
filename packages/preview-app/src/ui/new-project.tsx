import { useEffect, useRef, useState } from "react";
import { projectRouteHref } from "../project/model.js";
import { slugify } from "../app-shell.js";
import {
  ActionGroup,
  CodeBlock,
  Dialog,
  FormField,
  Icon,
  ResourceLinkList,
  StatusMessage,
} from "@wm-asset-workflows/ui-components";

interface ScaffoldResult {
  alreadyExists?: boolean;
  svgDir: string;
  groundingDir: string;
  documentation: string;
}

export function NewProject({ onClose }: { onClose(): void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScaffoldResult | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const doneButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (result) doneButton.current?.focus();
  }, [result]);
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const submittedName = name.trim();
    const directory = slugify(slug || name);
    if (!submittedName || !directory) {
      setError("Project name and slug are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/~scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: submittedName, slug: directory }),
      });
      const value = await response.json();
      if (!response.ok || value.error) throw new Error(value.error || "Scaffold failed");
      setName(submittedName);
      setSlug(directory);
      setResult(value);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      id="new-project-modal"
      title="New Project"
      titleId="np-modal-title"
      initialFocus={nameInput}
      onClose={onClose}
    >
      {!result ? (
        <div id="np-form-view">
          <div className="np-instructions">
            <p>Fill in the project details below. This will:</p>
            <ul>
              <li>
                Create <code>assets/svg/&lt;slug&gt;/</code> for your SVG sources
              </li>
              <li>
                Add a project entry to <code>manifests/assets.json</code>
              </li>
            </ul>
            <p>
              Then author your first asset using the <strong>Copilot Chat prompt</strong> shown
              after creation, or by opening{" "}
              <a
                href="../.github/prompts/create-svg-asset.prompt.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                .github/prompts/create-svg-asset.prompt.md
              </a>
              .
            </p>
          </div>
          <form id="np-form" className="np-form" noValidate onSubmit={create}>
            <FormField className="np-field" label="Project Name" controlId="np-name" required>
              <input
                ref={nameInput}
                id="np-name"
                name="name"
                type="text"
                className="wm-input"
                placeholder="e.g. My App"
                required
                autoComplete="off"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSlug(slugify(event.target.value));
                }}
              />
            </FormField>
            <FormField
              className="np-field"
              label="Directory Slug"
              controlId="np-slug"
              required
              hint={
                <>
                  Lowercase, numbers, hyphens only. Used as the folder name inside{" "}
                  <code>assets/svg/</code>.
                </>
              }
            >
              <input
                id="np-slug"
                name="slug"
                type="text"
                className="wm-input"
                placeholder="e.g. my-app"
                required
                autoComplete="off"
                pattern="[a-z0-9-]+"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </FormField>
            <StatusMessage id="np-error" className="np-error" tone="error" hidden={!error}>
              {error}
            </StatusMessage>
            <ActionGroup className="np-actions" align="stretch" wrap={false}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                {busy ? "Creating..." : "Create Project"}
              </button>
              <button type="button" className="btn btn-sm np-cancel" onClick={onClose}>
                Cancel
              </button>
            </ActionGroup>
          </form>
        </div>
      ) : (
        <div id="np-success-view">
          <div className="np-success-header">
            <Icon name="CircleCheck" />
            <strong id="np-success-name">{name}</strong> created
          </div>
          <ul className="np-created-items" id="np-created-items">
            <li>
              <Icon name={result.alreadyExists ? "Info" : "Check"} />
              {result.alreadyExists ? (
                "Project entry already existed in manifest (skipped)"
              ) : (
                <>
                  Added <code>{name}</code> to <code>manifests/assets.json</code>
                </>
              )}
            </li>
            {[result.svgDir, result.groundingDir, result.documentation].map((path) => (
              <li key={path}>
                <Icon name="Check" />
                Created <code>{path}</code>
              </li>
            ))}
          </ul>
          <div className="np-next-steps">
            <h4>Author your first asset</h4>
            <p>Copy this prompt into Copilot Chat:</p>
            <CodeBlock
              id="np-prompt-snippet"
              className="np-prompt-snippet"
            >{`/create-svg-asset\n\nProject: ${name}\nDirectory: ${result.svgDir}`}</CodeBlock>
            <div className="np-resource-links">
              <strong>Relevant files</strong>
              <ResourceLinkList
                id="np-resource-list"
                items={[
                  "manifests/assets.json",
                  ".github/prompts/create-svg-asset.prompt.md",
                  ".github/skills/wm-asset-manifest-spec/SKILL.md",
                  ".github/skills/wm-asset-authoring-workflow/SKILL.md",
                ].map((path) => ({ href: `../${path}`, label: path, external: true }))}
              />
            </div>
          </div>
          <ActionGroup className="np-actions" align="stretch" wrap={false}>
            <button
              ref={doneButton}
              type="button"
              className="btn btn-sm np-done"
              onClick={() => {
                window.location.hash = projectRouteHref(name).slice(1);
                window.location.reload();
              }}
            >
              Done
            </button>
          </ActionGroup>
        </div>
      )}
    </Dialog>
  );
}

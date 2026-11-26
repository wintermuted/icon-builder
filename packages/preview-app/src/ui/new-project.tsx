import { useEffect, useRef, useState } from "react";
import { projectRouteHref } from "../project/model.js";
import { slugify } from "../app-shell.js";
import { Icon } from "./icon.js";

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
  const previousFocus = useRef(document.activeElement);
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    nameInput.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const targets = Array.from(
          modal.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input, a[href]") ||
            [],
        ).filter((element) => element.getClientRects().length);
        const first = targets[0],
          last = targets.at(-1);
        if (!modal.current?.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const focus = previousFocus.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      if (focus instanceof HTMLElement) focus.focus();
    };
  }, [onClose]);
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
    <div
      id="new-project-modal"
      ref={modal}
      className="np-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="np-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="np-modal wm-card card">
        <div className="np-modal-header">
          <h3 id="np-modal-title">New Project</h3>
          <button className="np-close" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="X" />
          </button>
        </div>
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
              <div className="np-field">
                <label htmlFor="np-name">
                  Project Name <span aria-hidden="true">*</span>
                </label>
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
              </div>
              <div className="np-field">
                <label htmlFor="np-slug">
                  Directory Slug <span aria-hidden="true">*</span>
                </label>
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
                <p className="np-field-hint">
                  Lowercase, numbers, hyphens only. Used as the folder name inside{" "}
                  <code>assets/svg/</code>.
                </p>
              </div>
              <p id="np-error" className="np-error" role="alert" hidden={!error}>
                {error}
              </p>
              <div className="np-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  {busy ? "Creating..." : "Create Project"}
                </button>
                <button type="button" className="btn btn-sm np-cancel" onClick={onClose}>
                  Cancel
                </button>
              </div>
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
              <pre
                id="np-prompt-snippet"
                className="np-prompt-snippet"
              >{`/create-svg-asset\n\nProject: ${name}\nDirectory: ${result.svgDir}`}</pre>
              <div className="np-resource-links">
                <strong>Relevant files</strong>
                <ul id="np-resource-list">
                  {[
                    "manifests/assets.json",
                    ".github/prompts/create-svg-asset.prompt.md",
                    ".github/skills/wm-asset-manifest-spec/SKILL.md",
                    ".github/skills/wm-asset-authoring-workflow/SKILL.md",
                  ].map((path) => (
                    <li key={path}>
                      <a href={`../${path}`} target="_blank" rel="noopener noreferrer">
                        {path}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="np-actions">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

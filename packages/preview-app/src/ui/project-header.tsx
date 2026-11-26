import { useEffect, useRef, useState } from "react";
import { projectRouteHref } from "../project/model.js";
import { Icon } from "@wm-asset-workflows/ui-components";

export function ProjectHeader({ name, found }: { name: string; found: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  const rename = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus("Renaming...");
    try {
      const response = await fetch("/~project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: name, name: value.trim() }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Project rename failed");
      window.location.hash = projectRouteHref(result.name).slice(1);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };
  return (
    <header className="project-detail-header">
      <div className="project-detail-title-row">
        <a
          href="#logos"
          className="project-title-action"
          aria-label="Back to all assets"
          title="Back to all assets"
        >
          <Icon name="ArrowLeft" />
        </a>
        <h3 id="project-detail-title">{found ? name : "Project not found"}</h3>
        <button
          id="project-rename-button"
          type="button"
          className="project-title-action"
          aria-label="Rename project"
          title="Rename project"
          disabled={!found}
          onClick={() => setEditing(true)}
        >
          <Icon name="Pencil" />
        </button>
        <a
          id="project-deep-link"
          className="project-deep-link"
          href={window.location.href}
          title="Project deep link"
          aria-label={`${name} project deep link`}
        >
          <Icon name="Link" />
        </a>
      </div>
      <form
        id="project-rename-form"
        className="project-rename-form"
        data-project={name}
        hidden={!editing}
        onSubmit={rename}
      >
        <input
          ref={input}
          id="project-rename-input"
          className="wm-input"
          type="text"
          aria-label="Project name"
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          Save
        </button>
        <button
          id="project-rename-cancel"
          type="button"
          className="btn btn-sm"
          onClick={() => {
            setEditing(false);
            setStatus("");
            setValue(name);
          }}
        >
          Cancel
        </button>
        <p id="project-rename-status" aria-live="polite">
          {status}
        </p>
      </form>
    </header>
  );
}

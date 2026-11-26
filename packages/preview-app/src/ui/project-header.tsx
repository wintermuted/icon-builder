import { useState } from "react";
import { projectRouteHref } from "../project/model.js";
import {
  Icon,
  IconActionButton,
  InlineRename,
  PageHeader,
} from "@wm-asset-workflows/ui-components";

export function ProjectHeader({ name, found }: { name: string; found: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
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
    <PageHeader
      className="project-detail-header"
      titleRowClassName="project-detail-title-row"
      title={found ? name : "Project not found"}
      titleId="project-detail-title"
      leading={
        <a
          href="#logos"
          className="project-title-action"
          aria-label="Back to all assets"
          title="Back to all assets"
        >
          <Icon name="ArrowLeft" />
        </a>
      }
      actions={
        <>
          <IconActionButton
            id="project-rename-button"
            className="project-title-action"
            icon="Pencil"
            label="Rename project"
            disabled={!found}
            onClick={() => setEditing(true)}
          />
          <a
            id="project-deep-link"
            className="project-deep-link"
            href={window.location.href}
            title="Project deep link"
            aria-label={`${name} project deep link`}
          >
            <Icon name="Link" />
          </a>
        </>
      }
    >
      <InlineRename
        id="project-rename-form"
        className="project-rename-form"
        data-project={name}
        open={editing}
        value={value}
        label="Project name"
        busy={busy}
        onValueChange={setValue}
        onSubmit={rename}
        onCancel={() => {
          setEditing(false);
          setStatus("");
          setValue(name);
        }}
        inputProps={{ id: "project-rename-input", required: true }}
        cancelButtonProps={{ id: "project-rename-cancel" }}
        status={status}
        statusProps={{ id: "project-rename-status" }}
      />
    </PageHeader>
  );
}

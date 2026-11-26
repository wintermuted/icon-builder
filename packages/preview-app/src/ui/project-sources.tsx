import { useEffect, useRef, useState } from "react";
import { sourceRouteHref, resolveAssetPath } from "../project/model.js";
import { showToast } from "../app-shell.js";
import {
  ActionGroup,
  FileDropzone,
  Icon,
  IconActionButton,
  InlineRename,
  PreviewCard,
  StatusMessage,
} from "@wm-asset-workflows/ui-components";
import type { SteeringSource } from "../types.js";

interface Props {
  source: SteeringSource;
  projectName: string;
  favorites: string[];
  onFavorite(color: string, selected: boolean): Promise<void>;
}

export function ProjectSource({ source, projectName, favorites, onFavorite }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(source.title || "");
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const title = source.title || "Source Material";
  const kind = (source.kind || "text").toLowerCase();
  const href = sourceRouteHref(projectName, source.src);
  useEffect(() => {
    if (!confirming) return;
    const timeout = window.setTimeout(() => setConfirming(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [confirming]);
  const mutate = async (action: string) => {
    setBusy(true);
    setStatus(action === "rename" ? "Renaming..." : "Removing...");
    try {
      const response = await fetch("/~grounding-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectName,
          source: source.src,
          action,
          filename: action === "rename" ? name : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "Image update failed");
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.href).href);
      setStatus("");
      showToast("Link copied.");
    } catch {
      setStatus("Copy failed. Open the image and copy its URL manually.");
    }
  };
  if (kind !== "image")
    return (
      <PreviewCard className="source-material-card" header={<h5>{title}</h5>}>
        {kind === "url" ? (
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.url || "Open URL"}
          </a>
        ) : kind === "file" ? (
          <a href={resolveAssetPath(source.path || source.url || "")}>
            {source.path || source.url || "Open file"}
          </a>
        ) : (
          <p>{source.text || ""}</p>
        )}
      </PreviewCard>
    );
  return (
    <PreviewCard
      className="source-material-card"
      header={
        <div className="source-material-header">
          <h5>
            <a href={href}>{title}</a>
          </h5>
          <ActionGroup className="source-material-actions" gap="0.2rem" wrap={false}>
            <IconActionButton
              className="source-material-action"
              icon="Link"
              label={`Copy deep link for ${title}`}
              title="Copy deep link"
              onClick={copy}
            />
            <IconActionButton
              className="source-material-action"
              icon="Pencil"
              label={`Rename ${title}`}
              title="Rename image"
              onClick={() => setEditing(true)}
            />
            <IconActionButton
              className={`source-material-action source-material-delete${confirming ? " is-confirming" : ""}`}
              icon="Trash2"
              disabled={busy}
              label={`${confirming ? "Confirm removal of" : "Remove"} ${title}`}
              title={confirming ? "Click again to confirm removal" : "Remove image"}
              onClick={() => {
                if (confirming) void mutate("delete");
                else setConfirming(true);
              }}
            />
          </ActionGroup>
        </div>
      }
      preview={
        <a
          className="source-material-image-link"
          href={href}
          aria-label={`Open ${title} source page`}
        >
          <img
            className="source-material-image"
            src={resolveAssetPath(source.src || source.url || "")}
            alt={source.alt || source.title || "Source image"}
          />
        </a>
      }
    >
      {!!source.palette?.length && (
        <div className="source-material-palette">
          <p className="source-material-palette-label">Project favorites</p>
          <div className="source-material-swatches">
            {source.palette
              .slice(0, 10)
              .filter((entry) => /^#[0-9A-F]{6}$/i.test(entry.hex))
              .map((entry) => {
                const color = entry.hex.toUpperCase(),
                  selected = favorites.includes(color);
                return (
                  <FavoriteSwatch
                    key={color}
                    color={color}
                    selected={selected}
                    percentage={entry.percentage || 0}
                    onFavorite={onFavorite}
                  />
                );
              })}
          </div>
        </div>
      )}
      <InlineRename
        className="source-material-editor"
        open={editing}
        value={name}
        label="Image name"
        busy={busy}
        onValueChange={setName}
        onSubmit={(event) => {
          event.preventDefault();
          void mutate("rename");
        }}
        onCancel={() => {
          setEditing(false);
          setStatus("");
        }}
        inputProps={{ className: "wm-input source-material-name-input" }}
      />
      <StatusMessage className="source-material-status">{status}</StatusMessage>
    </PreviewCard>
  );
}

function FavoriteSwatch({
  color,
  selected,
  percentage,
  onFavorite,
}: {
  color: string;
  selected: boolean;
  percentage: number;
  onFavorite: Props["onFavorite"];
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="source-material-swatch"
      data-color={color}
      style={{ "--swatch-color": color } as React.CSSProperties}
      aria-pressed={selected}
      aria-label={`${selected ? "Remove" : "Select"} ${color} as a project favorite; ${percentage}% of image`}
      title={color}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onFavorite(color, !selected);
          showToast(`${color} ${selected ? "removed from" : "added to"} project favorites.`);
        } catch (error) {
          showToast(error instanceof Error ? error.message : String(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Icon name="Check" />
    </button>
  );
}

export function GroundingUpload({ projectName }: { projectName: string }) {
  const [status, setStatus] = useState("");
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timeout.current), []);
  const upload = async (files: File[]) => {
    if (!files.length) return;
    setStatus(`Uploading ${files.length} image${files.length === 1 ? "" : "s"}...`);
    try {
      for (const file of files) {
        const dataUrl = await new Promise<string>((accept, reject) => {
          const reader = new FileReader();
          reader.onload = () => accept(String(reader.result));
          reader.onerror = () => reject(reader.error || new Error("Could not read image"));
          reader.readAsDataURL(file);
        });
        const response = await fetch("/~grounding-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: projectName, filename: file.name, dataUrl }),
        });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || "Upload failed");
      }
      setStatus("Steering source material uploaded. Refreshing project sources...");
      timeout.current = window.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <>
      <FileDropzone
        id="project-grounding-dropzone"
        inputId="project-grounding-input"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        label="Drop images here or choose files"
        hint="PNG, JPEG, WebP, or GIF"
        onFilesSelected={(files) => void upload(files)}
      />
      <StatusMessage id="project-grounding-status" className="project-grounding-status">
        {status}
      </StatusMessage>
    </>
  );
}

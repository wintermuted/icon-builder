import { useEffect, useState } from "react";
import { collectColorUsageAcrossAssets } from "../project/icon-colors.js";
import { projectForAsset, projectRouteHref } from "../project/model.js";
import { Icon } from "./icon.js";

export function FavoriteColors({
  favorites,
  onRemove,
}: {
  favorites: string[];
  onRemove(color: string): Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <>
      <div id="project-favorite-colors" className="project-favorite-colors">
        {favorites.map((color) => (
          <div key={color} className="project-favorite-color">
            <span
              className="project-favorite-color-swatch"
              style={{ "--favorite-color": color } as React.CSSProperties}
              aria-hidden="true"
            />
            <code>{color}</code>
            <button
              type="button"
              className="project-favorite-color-remove"
              aria-label={`Remove ${color} from project favorites`}
              title="Remove color"
              disabled={busy === color}
              onClick={async () => {
                setBusy(color);
                try {
                  await onRemove(color);
                } finally {
                  setBusy(null);
                }
              }}
            >
              <Icon name="X" />
            </button>
          </div>
        ))}
      </div>
      <p
        id="project-favorite-colors-empty"
        className="project-favorite-colors-empty"
        hidden={!!favorites.length}
      >
        Select image swatches or add a custom color.
      </p>
    </>
  );
}

type ColorUsage = Awaited<ReturnType<typeof collectColorUsageAcrossAssets>>;
export function ProjectIconColors({ projectName }: { projectName: string }) {
  const [data, setData] = useState<ColorUsage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    collectColorUsageAcrossAssets().then(
      (result) => {
        if (active) setData(result);
      },
      (reason) => {
        console.error("Project colors unavailable", reason);
        if (active) setError("Colors unavailable.");
      },
    );
    return () => {
      active = false;
    };
  }, [projectName]);
  const colors = new Set<string>();
  for (const entry of data?.entries || []) {
    if (projectForAsset(entry.asset) === projectName)
      for (const color of entry.colors) colors.add(color.toUpperCase());
  }
  return (
    <div className="project-icon-colors">
      <h5 id="project-icon-colors-heading" className="project-icon-colors-heading">
        Colors used in project icons
      </h5>
      <div
        id="project-icon-colors-list"
        className="project-icon-colors-list"
        aria-labelledby="project-icon-colors-heading"
      >
        {Array.from(colors)
          .sort()
          .map((color) => {
            const projects = data?.usage.get(color)?.projects;
            const names = Array.from(projects?.keys() || []).sort();
            return (
              <div
                key={color}
                className="project-icon-color"
                tabIndex={0}
                aria-label={`${color}, used in ${names.join(", ")}`}
              >
                <span
                  className="project-icon-color-swatch"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <code className="project-icon-color-value">{color}</code>
                <div
                  className="project-icon-color-tooltip"
                  role="group"
                  aria-label={`Projects using ${color}`}
                >
                  <p className="project-icon-color-tooltip-heading">
                    {color} · used in {names.length} project{names.length === 1 ? "" : "s"}
                  </p>
                  <ul className="project-icon-color-tooltip-links">
                    {names.map((name) => {
                      const count = projects?.get(name)?.length || 0;
                      return (
                        <li key={name}>
                          <a href={projectRouteHref(name)}>{name}</a>
                          <span className="project-icon-color-tooltip-count">
                            {count} icon{count === 1 ? "" : "s"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
      </div>
      <p
        id="project-icon-colors-empty"
        className="project-icon-colors-empty"
        hidden={!!colors.size}
      >
        {error ||
          (data
            ? "No colors found in this project's icons yet."
            : "Loading colors from project icons...")}
      </p>
    </div>
  );
}

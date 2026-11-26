import { useState } from "react";
import { appState } from "../app-state.js";
import {
  projectForAsset,
  normalizeProjectSteer,
  updateProjectFavoriteColor,
  normalizeProjectSlots,
  resolveSlotPreview,
} from "../project/model.js";
import { showToast } from "../app-shell.js";
import { Icon } from "./icon.js";
import { ProjectSource, GroundingUpload } from "./project-sources.js";
import { FavoriteColors, ProjectIconColors } from "./project-colors.js";
import { ProjectHeader } from "./project-header.js";
import { ProjectAssets } from "./project-prompts.js";

export function ProjectPage({ projectName }: { projectName: string }) {
  const meta = appState.projectMetaByName.get(projectName);
  const assets = appState.assetData
    .filter((asset) => projectForAsset(asset) === projectName)
    .sort((a, b) => a.label.localeCompare(b.label));
  const found = !!meta || !!assets.length;
  const [steer, setSteer] = useState(() => normalizeProjectSteer(projectName));
  const [customColor, setCustomColor] = useState("#257375");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const updateColor = async (color: string, selected: boolean, custom = false) => {
    await updateProjectFavoriteColor(projectName, color, selected, custom);
    setSteer(normalizeProjectSteer(projectName));
  };
  const remove = async (color: string) => {
    try {
      await updateColor(color, false, steer.customColors.includes(color));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <section id="project-detail" className="project-detail-page">
      <ProjectHeader name={projectName} found={found} />
      {found && (
        <div className="project-workspace">
          <div className="project-workspace-guidance">
            <details className="project-grounding-section project-collapsible-card" open>
              <summary>
                <h4 id="project-grounding-heading">Steering Source Material</h4>
                <Icon name="ChevronDown" />
              </summary>
              <div className="project-collapsible-body" aria-labelledby="project-grounding-heading">
                <p>Upload reference images that should steer the design of generated assets.</p>
                <GroundingUpload projectName={projectName} />
                <p
                  id="project-steer-empty"
                  className={`project-steer-empty${steer.notes.length || steer.sources.length ? " is-hidden" : ""}`}
                >
                  No steering source material has been added for this project yet.
                </p>
                <ul id="project-steer-notes" className="project-steer-notes">
                  {steer.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
                <div id="project-steer-sources" className="project-steer-sources">
                  {steer.sources.map((source, index) => (
                    <ProjectSource
                      key={source.src || index}
                      source={source}
                      projectName={projectName}
                      favorites={steer.favoriteColors}
                      onFavorite={updateColor}
                    />
                  ))}
                </div>
              </div>
            </details>
            <details className="project-colors-section project-collapsible-card" open>
              <summary>
                <h4 id="project-colors-heading">Colors</h4>
                <Icon name="ChevronDown" />
              </summary>
              <div className="project-collapsible-body" aria-labelledby="project-colors-heading">
                <div className="project-colors-header">
                  <form
                    id="project-custom-color-form"
                    className="project-custom-color-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setBusy(true);
                      setStatus("Adding color...");
                      try {
                        await updateColor(customColor.toUpperCase(), true, true);
                        setStatus("");
                        showToast(`${customColor.toUpperCase()} added to project favorites.`);
                      } catch (error) {
                        setStatus(error instanceof Error ? error.message : String(error));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <input
                      id="project-custom-color-input"
                      type="color"
                      value={customColor}
                      aria-label="Custom project color"
                      onChange={(event) => setCustomColor(event.target.value)}
                    />
                    <output id="project-custom-color-value" htmlFor="project-custom-color-input">
                      {customColor.toUpperCase()}
                    </output>
                    <button
                      type="submit"
                      className="btn btn-sm"
                      title="Add custom color"
                      disabled={busy}
                    >
                      <Icon name="Plus" />
                      Add color
                    </button>
                  </form>
                </div>
                <FavoriteColors favorites={steer.favoriteColors} onRemove={remove} />
                <p
                  id="project-custom-color-status"
                  className="project-custom-color-status"
                  aria-live="polite"
                >
                  {status}
                </p>
                <ProjectIconColors projectName={projectName} />
              </div>
            </details>
          </div>
          <div className="project-workspace-assets">
            <details className="project-slots-section project-collapsible-card" open>
              <summary>
                <h4 id="project-slots-heading">Web and App Icon Slots</h4>
                <Icon name="ChevronDown" />
              </summary>
              <div className="project-collapsible-body" aria-labelledby="project-slots-heading">
                <div id="project-icon-slots" className="project-icon-slots">
                  {normalizeProjectSlots(projectName).map((slot) => {
                    const preview = resolveSlotPreview(slot);
                    const image = (
                      <img
                        className="icon-slot-image"
                        src={preview.src}
                        alt={`${slot.title} preview`}
                      />
                    );
                    return (
                      <article key={slot.id} className="icon-slot-card">
                        <div className="icon-slot-header">
                          <h5>{slot.title}</h5>
                          <p className="icon-slot-usage">{slot.usage}</p>
                        </div>
                        <div className="icon-slot-body">
                          {preview.sourceType === "asset" || preview.sourceType === "src" ? (
                            preview.href ? (
                              <a href={preview.href} className="icon-slot-image-link">
                                {image}
                              </a>
                            ) : (
                              image
                            )
                          ) : preview.sourceType === "url" ? (
                            <a href={preview.href} target="_blank" rel="noopener noreferrer">
                              {preview.label}
                            </a>
                          ) : (
                            <p className="icon-slot-empty">No source assigned</p>
                          )}
                          {slot.note && <p className="icon-slot-note">{slot.note}</p>}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </details>
            <ProjectAssets project={meta || { name: projectName }} assets={assets} />
          </div>
        </div>
      )}
    </section>
  );
}

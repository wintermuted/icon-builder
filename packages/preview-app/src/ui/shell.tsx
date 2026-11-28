import { useCallback, useEffect, useState } from "react";
import { getRouteFromHash, applyThemeFromQuery } from "../app-shell.js";
import { Collection } from "./collection.js";
import { AppFrame, Diagrams, Icon, Toast } from "@wm-asset-workflows/ui-components";
import { appState } from "../app-state.js";
import { AssetPage } from "./asset-page.js";
import { ProjectPage } from "./project-page.js";
import { SourcePage } from "./source-page.js";
import { NewProject } from "./new-project.js";
import { isCopilotCanvas } from "../copilot-canvas.js";

function AppToast() {
  const [notice, setNotice] = useState({ message: "", revision: 0 });
  const dismiss = useCallback(() => setNotice((notice) => ({ ...notice, message: "" })), []);
  useEffect(() => {
    const show = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      setNotice((notice) => ({ message: String(event.detail), revision: notice.revision + 1 }));
    };
    window.addEventListener("preview-toast", show);
    return () => window.removeEventListener("preview-toast", show);
  }, []);
  return (
    <Toast id="app-toast" message={notice.message} resetKey={notice.revision} onDismiss={dismiss} />
  );
}

export function PreviewApp() {
  const [route, setRoute] = useState(getRouteFromHash);
  const [theme, setTheme] = useState(() => {
    applyThemeFromQuery();
    return document.documentElement.getAttribute("data-theme") || "light";
  });
  const [newProject, setNewProject] = useState(false);
  const closeModal = useCallback(() => setNewProject(false), []);
  useEffect(() => {
    const update = () => setRoute(getRouteFromHash());
    window.addEventListener("hashchange", update);
    if (!window.location.hash) window.location.hash = "#logos";
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (!isCopilotCanvas) return;
    const update = () => setTheme(document.documentElement.dataset.theme || "light");
    window.addEventListener("canvas-theme", update);
    return () => window.removeEventListener("canvas-theme", update);
  }, []);
  useEffect(() => {
    const topbar = document.querySelector(".docs-topbar");
    const headers = document.querySelectorAll<HTMLElement>(
      "#project-detail > .project-detail-header, #asset-detail > .project-detail-header",
    );
    const assetHeader = document.querySelector("#asset-detail > .project-detail-header");
    if (!topbar) return;
    const update = () => {
      const height = topbar.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--preview-topbar-height", `${height}px`);
      if (assetHeader)
        document.documentElement.style.setProperty(
          "--asset-detail-header-height",
          `${assetHeader.getBoundingClientRect().height}px`,
        );
      for (const header of headers)
        header.classList.toggle(
          "is-stuck",
          header.getClientRects().length > 0 &&
            window.scrollY > 0 &&
            header.getBoundingClientRect().top <= height + 1,
        );
    };
    const observer = new ResizeObserver(update);
    observer.observe(topbar);
    if (assetHeader) observer.observe(assetHeader);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [route]);
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("wm-assets-theme", next);
    setTheme(next);
  };
  return (
    <AppFrame
      bodyClassName="preview-shell"
      mainClassName="preview-content"
      header={
        <header className="docs-topbar">
          <div className="docs-topbar-inner">
            <div className="docs-topbar-brand">
              <h1 className="preview-brand-title">
                {!isCopilotCanvas && (
                  <img
                    className="preview-brand-icon"
                    src="../assets/svg/wintermuted-brand/wm-wintermuted-mark-cube-outline-white.svg"
                    alt="Wintermuted mark"
                  />
                )}
                <span>{isCopilotCanvas ? "Icon Builder" : "Agentic Icon Builder"}</span>
              </h1>
            </div>
            <nav className="docs-topbar-nav wm-app-nav-nowrap" aria-label="Primary navigation">
              {(
                [
                  ["logos", "Home"],
                  ["diagrams", "About"],
                ] as const
              ).map(([tab, label]) => (
                <a
                  key={tab}
                  className={`docs-topbar-link-devdocs${route.tab === tab ? " is-active" : ""}`}
                  href={`#${tab}`}
                  data-preview-tab={tab}
                  aria-current={route.tab === tab ? "page" : undefined}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </header>
      }
      overlays={
        <>
          <AppToast />
          {newProject && <NewProject onClose={closeModal} />}
        </>
      }
      footer={
        !isCopilotCanvas && (
          <footer className="app-footer">
            <div className="app-footer-inner">
              <a
                className="docs-topbar-github app-footer-github"
                href="https://github.com/wintermuted/wm-asset-workflows"
                target="_blank"
                rel="noopener noreferrer"
                title="View source on GitHub"
              >
                <Icon name="Github" />
                <span>wintermuted/wm-asset-workflows</span>
              </a>
              <div className="docs-topbar-actions app-footer-actions">
                <button
                  id="theme-toggle"
                  type="button"
                  className="docs-topbar-toggle"
                  aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                  onClick={toggleTheme}
                >
                  <Icon name={theme === "dark" ? "Sun" : "Moon"} />
                  <span>{theme === "dark" ? "Light" : "Dark"}</span>
                </button>
              </div>
            </div>
          </footer>
        )
      }
    >
      {route.page === "asset" ? (
        <AssetPage key={route.assetId} assetId={route.assetId} />
      ) : route.page === "project" ? (
        <ProjectPage key={route.projectName} projectName={route.projectName} />
      ) : route.page === "source" ? (
        <SourcePage
          key={`${route.projectName}/${route.sourcePath}`}
          projectName={route.projectName}
          sourcePath={route.sourcePath}
        />
      ) : (
        <>
          <Collection onNewProject={() => setNewProject(true)} />
          <Diagrams
            theme={theme}
            diagrams={appState.diagramData}
            renderer={typeof mermaid === "undefined" ? undefined : mermaid}
          />
        </>
      )}
    </AppFrame>
  );
}

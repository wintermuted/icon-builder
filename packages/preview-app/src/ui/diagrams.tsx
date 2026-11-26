import { useEffect, useRef, useState } from "react";
import { appState } from "../app-state.js";

function Diagram({ id, code, theme }: { id: string; code: string; theme: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: theme === "dark" ? "dark" : "default",
    });
    mermaid.render(id, code).then(
      ({ svg }) => {
        if (active && root.current) {
          root.current.innerHTML = svg;
          setError("");
        }
      },
      (reason) => {
        console.error("Diagram rendering failed", reason);
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      },
    );
    return () => {
      active = false;
    };
  }, [id, code, theme]);
  return (
    <>
      <div ref={root} className="mermaid" />
      <p role="alert" hidden={!error}>
        {error}
      </p>
    </>
  );
}

export function Diagrams({ theme }: { theme: string }) {
  return (
    <section id="diagrams" className="card">
      <div className="card-header">
        <h3>Markdown Diagram Specs</h3>
      </div>
      <div className="card-body">
        <div id="diagram-grid" className="asset-grid">
          {appState.diagramData.map((item, index) => (
            <article key={item.id} className="asset-tile">
              <h3>{item.title}</h3>
              <Diagram id={`diagram-${index}`} code={item.code} theme={theme} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";

export interface MermaidRenderer {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
}

export interface DiagramSpec {
  id: string;
  title: string;
  code: string;
}

export function Diagram({
  id,
  code,
  theme,
  renderer,
}: {
  id: string;
  code: string;
  theme: string;
  renderer: MermaidRenderer;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    renderer.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: theme === "dark" ? "dark" : "default",
    });
    renderer.render(id, code).then(
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
  }, [id, code, theme, renderer]);
  return (
    <>
      <div ref={root} className="mermaid" />
      <p role="alert" hidden={!error}>
        {error}
      </p>
    </>
  );
}

export function Diagrams({
  theme,
  diagrams,
  renderer,
}: {
  theme: string;
  diagrams: readonly DiagramSpec[];
  renderer?: MermaidRenderer;
}) {
  return (
    <section id="diagrams" className="card">
      <div className="card-header">
        <h3>Markdown Diagram Specs</h3>
      </div>
      <div className="card-body">
        {!renderer && diagrams.length > 0 && (
          <p role="alert">
            Diagrams unavailable: Mermaid failed to load. Reload the page to retry.
          </p>
        )}
        <div id="diagram-grid" className="asset-grid">
          {renderer &&
            diagrams.map((item, index) => (
              <article key={item.id} className="asset-tile">
                <h3>{item.title}</h3>
                <Diagram
                  id={`diagram-${index}`}
                  code={item.code}
                  theme={theme}
                  renderer={renderer}
                />
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}

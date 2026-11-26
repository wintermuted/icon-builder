import { Component, type ReactNode } from "react";

export class PreviewBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Preview rendering failed", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="preview-content">
        <section className="card">
          <div className="card-header">
            <h3>Preview failed</h3>
          </div>
          <div className="card-body">
            <p role="alert">{this.state.error.message}</p>
            <button type="button" className="btn btn-sm" onClick={() => window.location.reload()}>
              Reload preview
            </button>
          </div>
        </section>
      </main>
    );
  }
}

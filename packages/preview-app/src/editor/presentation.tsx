import { createElement, useCallback, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";

type Presentation = { host: HTMLElement; content: ReactNode; key: number };

export class EditorPresentation {
  revision = 0;
  private entries: readonly Presentation[] = [];
  private listeners = new Set<() => void>();
  private nextKey = 0;
  private disposed = false;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.entries;

  mount(host: HTMLElement, content: ReactNode) {
    if (this.disposed) throw new Error("Cannot mount a disposed editor presentation.");
    flushSync(() => {
      this.entries = [...this.entries, { host, content, key: this.nextKey++ }];
      this.listeners.forEach((listener) => listener());
    });
  }

  clear() {
    this.revision++;
    if (!this.entries.length) return;
    flushSync(() => {
      this.entries = [];
      this.listeners.forEach((listener) => listener());
    });
  }

  dispose() {
    this.revision++;
    this.disposed = true;
    this.entries = [];
    this.listeners.clear();
  }
}

export function EditorPortals({ presentation }: { presentation: EditorPresentation }) {
  const entries = useSyncExternalStore(presentation.subscribe, presentation.getSnapshot);
  return entries.map(({ host, content, key }) => createPortal(content, host, key));
}

function NativeControl({ element }: { element: HTMLElement }) {
  const attach = useCallback(
    (host: HTMLSpanElement | null) => {
      if (host) host.appendChild(element);
    },
    [element],
  );
  return <span ref={attach} style={{ display: "contents" }} />;
}

// Controllers retain their existing native controls; React owns the surrounding presentation.
export function nativeControl(element: HTMLElement) {
  return createElement(NativeControl, { element });
}

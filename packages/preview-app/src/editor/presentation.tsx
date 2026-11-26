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
  private pending: Presentation[] = [];
  private initializers: (() => void)[] = [];
  private batchDepth = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.entries;

  mount(host: HTMLElement, content: ReactNode) {
    if (this.disposed) throw new Error("Cannot mount a disposed editor presentation.");
    this.pending.push({ host, content, key: this.nextKey++ });
    if (!this.batchDepth) this.commit();
  }

  batch(render: () => void) {
    if (this.disposed) throw new Error("Cannot batch a disposed editor presentation.");
    const pendingStart = this.pending.length;
    const initializerStart = this.initializers.length;
    this.batchDepth++;
    try {
      render();
    } catch (error) {
      this.pending.length = pendingStart;
      this.initializers.length = initializerStart;
      throw error;
    } finally {
      this.batchDepth--;
      if (!this.batchDepth) this.commit();
    }
  }

  afterMount(initialize: () => void) {
    if (this.disposed) throw new Error("Cannot initialize a disposed editor presentation.");
    if (this.batchDepth) this.initializers.push(initialize);
    else initialize();
  }

  private commit() {
    const pending = this.pending;
    const initializers = this.initializers;
    this.pending = [];
    this.initializers = [];
    if (pending.length) {
      flushSync(() => {
        this.entries = this.entries.concat(pending);
        this.listeners.forEach((listener) => listener());
      });
    }
    initializers.forEach((initialize) => initialize());
  }

  clear() {
    this.revision++;
    this.pending = [];
    this.initializers = [];
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
    this.pending = [];
    this.initializers = [];
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

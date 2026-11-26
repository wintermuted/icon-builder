import { useEffect, useId, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { IconActionButton } from "./icon-action-button.js";

export interface DialogProps {
  id?: string;
  title: ReactNode;
  titleId?: string;
  children: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  onClose(): void;
}

export function Dialog({ id, title, titleId, children, initialFocus, onClose }: DialogProps) {
  const generatedId = useId();
  const headingId = titleId ?? generatedId;
  const modal = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const focusable = () =>
      Array.from(
        modal.current?.querySelectorAll<HTMLElement>(
          "button, input, select, textarea, a[href], [tabindex]",
        ) ?? [],
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.matches(":disabled") &&
          !element.closest("[inert]") &&
          element.getClientRects().length > 0,
      );
    (initialFocus?.current ?? focusable()[0] ?? modal.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const targets = focusable();
      const first = targets[0];
      const last = targets.at(-1);
      if (!first) {
        event.preventDefault();
        modal.current?.focus();
      } else if (!modal.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [initialFocus]);
  return (
    <div
      id={id}
      ref={modal}
      className="np-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      tabIndex={-1}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="np-modal wm-card card">
        <div className="np-modal-header">
          <h3 id={headingId}>{title}</h3>
          <IconActionButton className="np-close" icon="X" label="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

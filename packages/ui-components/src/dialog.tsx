import { useEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { Dialog as SharedDialog } from "@wintermuted/ui-react";
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
  useEffect(() => {
    initialFocus?.current?.focus();
  }, [initialFocus]);
  return (
    <div className="np-backdrop">
      <SharedDialog
        open
        id={id}
        title={title}
        titleId={titleId}
        onClose={onClose}
        closeAction={
          <IconActionButton className="np-close" icon="X" label="Close" onClick={onClose} />
        }
        className="np-modal wm-card card"
        aria-modal="true"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }}
      >
        {children}
      </SharedDialog>
    </div>
  );
}

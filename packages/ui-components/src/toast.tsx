import { useEffect, useState } from "react";
import type { HTMLAttributes } from "react";
import { Toast as SharedToast } from "@wintermuted/ui-react";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  message: string;
  duration?: number;
  resetKey?: string | number;
  onDismiss?(): void;
}

export function Toast({
  message,
  duration = 2400,
  resetKey,
  onDismiss,
  className = "app-toast",
  ...props
}: ToastProps) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [message, resetKey]);
  const open = Boolean(message) && !dismissed;
  useEffect(() => {
    if (!open || !onDismiss) return;
    const timeout = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timeout);
  }, [message, duration, resetKey, onDismiss, open]);
  return (
    <div {...props} className={`wm-timed-toast ${className}`} aria-atomic="true" hidden={!open}>
      <SharedToast
        open={open}
        message={message}
        tone="info"
        dismissLabel="Dismiss notification"
        onDismiss={() => {
          setDismissed(true);
          onDismiss?.();
        }}
      />
    </div>
  );
}

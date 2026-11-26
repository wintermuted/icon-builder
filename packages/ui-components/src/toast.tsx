import { useEffect } from "react";
import type { HTMLAttributes } from "react";

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
  useEffect(() => {
    if (!message || !onDismiss) return;
    const timeout = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timeout);
  }, [message, duration, resetKey, onDismiss]);
  return (
    <div
      {...props}
      className={className}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      hidden={!message}
    >
      {message}
    </div>
  );
}

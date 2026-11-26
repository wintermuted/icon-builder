import type { ComponentPropsWithRef } from "react";

export interface StatusMessageProps extends ComponentPropsWithRef<"p"> {
  tone?: "neutral" | "progress" | "success" | "error";
}

export function StatusMessage({
  tone = "neutral",
  role = tone === "error" ? "alert" : undefined,
  className = "",
  ...props
}: StatusMessageProps) {
  return (
    <p
      aria-live={tone === "error" ? "assertive" : "polite"}
      {...props}
      role={role}
      data-tone={tone}
      className={`wm-status-message ${className}`}
    />
  );
}

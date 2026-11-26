import type { ComponentPropsWithRef, CSSProperties } from "react";

export interface ActionGroupProps extends ComponentPropsWithRef<"div"> {
  gap?: CSSProperties["gap"];
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean;
}

export function ActionGroup({
  gap,
  align,
  justify,
  wrap = true,
  className = "",
  style,
  ...props
}: ActionGroupProps) {
  return (
    <div
      {...props}
      className={`wm-action-group ${className}`}
      style={{
        gap,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? "wrap" : "nowrap",
        ...style,
      }}
    />
  );
}

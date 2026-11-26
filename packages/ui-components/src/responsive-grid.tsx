import type { ComponentPropsWithRef, CSSProperties } from "react";

export interface ResponsiveGridProps extends ComponentPropsWithRef<"div"> {
  minItemWidth?: string;
  gap?: CSSProperties["gap"];
  mode?: "auto-fit" | "auto-fill";
}

export function ResponsiveGrid({
  minItemWidth = "220px",
  gap = "0.85rem",
  mode = "auto-fit",
  className = "",
  style,
  ...props
}: ResponsiveGridProps) {
  return (
    <div
      {...props}
      className={`wm-responsive-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${mode}, minmax(min(100%, ${minItemWidth}), 1fr))`,
        gap,
        ...style,
      }}
    />
  );
}

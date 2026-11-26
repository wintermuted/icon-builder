import type { ComponentPropsWithRef, CSSProperties } from "react";

export interface SplitLayoutProps extends ComponentPropsWithRef<"div"> {
  primarySize?: string;
  secondarySize?: string;
  secondaryMinWidth?: string;
  gap?: string;
  stackGap?: string;
  collapseAt?: "compact" | "medium" | "wide";
}

export function SplitLayout({
  primarySize = "1fr",
  secondarySize = "1fr",
  secondaryMinWidth = "0px",
  gap = "1rem",
  stackGap = gap,
  collapseAt = "medium",
  className = "",
  style,
  ...props
}: SplitLayoutProps) {
  const layoutStyle: CSSProperties &
    Record<"--wm-split-columns" | "--wm-split-gap" | "--wm-split-stack-gap", string> = {
    "--wm-split-columns": `minmax(0, ${primarySize}) minmax(${secondaryMinWidth}, ${secondarySize})`,
    "--wm-split-gap": gap,
    "--wm-split-stack-gap": stackGap,
    ...style,
  };
  return (
    <div
      {...props}
      className={`wm-split-layout wm-split-layout--${collapseAt} ${className}`}
      style={layoutStyle}
    />
  );
}

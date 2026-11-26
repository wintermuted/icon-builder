import type { ComponentPropsWithRef, CSSProperties } from "react";

export interface PreviewSurfaceProps extends ComponentPropsWithRef<"div"> {
  maxImageHeight?: string;
  imageWidth?: string;
}

export function PreviewSurface({
  maxImageHeight = "80px",
  imageWidth = "auto",
  className = "",
  style,
  ...props
}: PreviewSurfaceProps) {
  const surfaceStyle: CSSProperties &
    Record<"--wm-preview-image-height" | "--wm-preview-image-width", string> = {
    "--wm-preview-image-height": maxImageHeight,
    "--wm-preview-image-width": imageWidth,
    ...style,
  };
  return <div {...props} className={`wm-preview-surface ${className}`} style={surfaceStyle} />;
}

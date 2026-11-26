import type { ComponentPropsWithRef, ReactNode } from "react";

export interface AppFrameProps extends ComponentPropsWithRef<"div"> {
  header?: ReactNode;
  footer?: ReactNode;
  overlays?: ReactNode;
  bodyClassName?: string;
  mainClassName?: string;
}

export function AppFrame({
  header,
  footer,
  overlays,
  children,
  bodyClassName = "",
  mainClassName = "",
  className = "",
  ...props
}: AppFrameProps) {
  return (
    <div {...props} className={`wm-app-frame ${className}`}>
      {header}
      <div className={`wm-app-frame-body ${bodyClassName}`}>
        <main className={`wm-app-frame-main ${mainClassName}`}>{children}</main>
      </div>
      {overlays}
      {footer}
    </div>
  );
}

import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";

export interface PageHeaderProps extends Omit<ComponentPropsWithRef<"header">, "title"> {
  title: ReactNode;
  titleId?: string;
  navigation?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  titleRowClassName?: string;
  sticky?: boolean;
  stickyTop?: CSSProperties["top"];
}

export function PageHeader({
  title,
  titleId,
  navigation,
  leading,
  actions,
  meta,
  children,
  titleRowClassName = "",
  sticky = false,
  stickyTop = 0,
  className = "",
  style,
  ...props
}: PageHeaderProps) {
  return (
    <header
      {...props}
      className={`wm-page-header ${className}`}
      style={{
        position: sticky ? "sticky" : undefined,
        top: sticky ? stickyTop : undefined,
        zIndex: sticky ? 90 : undefined,
        ...style,
      }}
    >
      {navigation}
      <div className={`wm-page-header-row ${titleRowClassName}`}>
        {leading}
        <h3 id={titleId}>{title}</h3>
        {actions}
      </div>
      {meta}
      {children}
    </header>
  );
}

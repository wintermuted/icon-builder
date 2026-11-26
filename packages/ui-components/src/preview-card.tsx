import type { HTMLAttributes, ReactNode } from "react";

export interface PreviewCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  header?: ReactNode;
  preview?: ReactNode;
  title?: ReactNode;
  titleHref?: string;
  footer?: ReactNode;
}

export function PreviewCard({
  header,
  preview,
  title,
  titleHref,
  children,
  footer,
  className = "asset-tile",
  ...props
}: PreviewCardProps) {
  return (
    <article {...props} className={className}>
      {header}
      {preview}
      {title != null &&
        (titleHref ? (
          <a className="asset-title-link" href={titleHref}>
            <h3>{title}</h3>
          </a>
        ) : (
          <h3>{title}</h3>
        ))}
      {children}
      {footer}
    </article>
  );
}

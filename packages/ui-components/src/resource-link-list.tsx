import type { ComponentPropsWithRef, Key, ReactNode } from "react";

export interface ResourceLink {
  key?: Key;
  href: string;
  label: ReactNode;
  external?: boolean;
  metadata?: ReactNode;
}

export interface ResourceLinkListProps extends Omit<ComponentPropsWithRef<"ul">, "children"> {
  items: readonly ResourceLink[];
}

export function ResourceLinkList({ items, className = "", ...props }: ResourceLinkListProps) {
  return (
    <ul {...props} className={`wm-resource-link-list ${className}`}>
      {items.map((item) => (
        <li key={item.key ?? item.href}>
          <a
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
          >
            {item.label}
          </a>
          {item.metadata}
        </li>
      ))}
    </ul>
  );
}

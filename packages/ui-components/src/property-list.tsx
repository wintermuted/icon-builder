import { Fragment } from "react";
import type { ComponentPropsWithRef, CSSProperties, Key, ReactNode } from "react";

export interface PropertyListItem {
  key?: Key;
  label: ReactNode;
  value: ReactNode;
}

export interface PropertyListProps extends Omit<ComponentPropsWithRef<"dl">, "children"> {
  items: readonly PropertyListItem[];
  gap?: CSSProperties["gap"];
}

export function PropertyList({ items, gap, className = "", style, ...props }: PropertyListProps) {
  return (
    <dl {...props} className={`wm-property-list ${className}`} style={{ gap, ...style }}>
      {items.map((item, index) => (
        <Fragment key={item.key ?? index}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

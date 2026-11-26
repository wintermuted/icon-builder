import type { ComponentPropsWithRef } from "react";

export interface SelectableListItemProps extends ComponentPropsWithRef<"li"> {
  active?: boolean;
  selected?: boolean;
  marked?: boolean;
  dragging?: boolean;
  dropTarget?: boolean;
}

export function SelectableListItem({
  active = false,
  selected = false,
  marked = false,
  dragging = false,
  dropTarget = false,
  className = "",
  ...props
}: SelectableListItemProps) {
  const states = [
    active && "is-active",
    selected && "is-selected",
    marked && "is-multi-selected",
    dragging && "is-dragging",
    dropTarget && "is-drag-over",
  ]
    .filter(Boolean)
    .join(" ");
  return <li {...props} className={`wm-selectable-list-item ${states} ${className}`} />;
}

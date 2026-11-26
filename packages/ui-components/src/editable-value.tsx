import type { ComponentPropsWithRef, ReactNode } from "react";
import { IconActionButton } from "./icon-action-button.js";

export interface EditableValueProps extends ComponentPropsWithRef<"div"> {
  label: ReactNode;
  value: ReactNode;
  editLabel: string;
  onEdit?(): void;
  valueProps?: ComponentPropsWithRef<"code">;
  editButtonProps?: Omit<ComponentPropsWithRef<"button">, "children" | "onClick" | "aria-label">;
}

export function EditableValue({
  label,
  value,
  editLabel,
  onEdit,
  valueProps,
  editButtonProps,
  className = "",
  ...props
}: EditableValueProps) {
  return (
    <div {...props} className={`wm-editable-value ${className}`}>
      <span>{label}</span>
      <code {...valueProps}>{value}</code>
      <IconActionButton {...editButtonProps} icon="Pencil" label={editLabel} onClick={onEdit} />
    </div>
  );
}

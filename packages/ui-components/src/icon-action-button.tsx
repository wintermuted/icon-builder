import type { ComponentPropsWithRef } from "react";
import { Button } from "@wintermuted/ui-react";
import { Icon, type IconName } from "./icon.js";

export interface IconActionButtonProps extends Omit<
  ComponentPropsWithRef<"button">,
  "children" | "aria-label"
> {
  icon: IconName;
  label: string;
}

export function IconActionButton({
  icon,
  label,
  title = label,
  type = "button",
  className = "wm-icon-action",
  ...props
}: IconActionButtonProps) {
  return (
    <Button
      {...props}
      variant="ghost"
      type={type}
      className={`wm-icon-action-button ${className}`}
      aria-label={label}
      title={title}
    >
      <Icon name={icon} />
    </Button>
  );
}

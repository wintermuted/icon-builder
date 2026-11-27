import type { ComponentPropsWithRef } from "react";
import { Button } from "@wintermuted/ui-react";
import { Icon, type IconName } from "./icon.js";

export interface ToggleButtonProps extends Omit<ComponentPropsWithRef<"button">, "aria-pressed"> {
  pressed: boolean;
  onPressedChange?(pressed: boolean): void;
  icon?: IconName;
}

export function ToggleButton({
  pressed,
  onPressedChange,
  icon,
  onClick,
  children,
  type = "button",
  className = "btn btn-sm",
  ...props
}: ToggleButtonProps) {
  return (
    <Button
      {...props}
      variant="ghost"
      type={type}
      className={`wm-toggle-button ${className}`}
      aria-pressed={pressed}
      onClick={
        onPressedChange
          ? (event) => {
              onClick?.(event);
              if (!event.defaultPrevented) onPressedChange(!pressed);
            }
          : onClick
      }
    >
      {icon && <Icon name={icon} />}
      {children}
    </Button>
  );
}

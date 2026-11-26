import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon, type IconName } from "./icon.js";

export interface EmptyStateProps extends ComponentPropsWithRef<"div"> {
  heading?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  heading,
  icon,
  action,
  compact = false,
  children,
  className = "",
  ...props
}: EmptyStateProps) {
  return (
    <div
      {...props}
      className={`wm-empty-state${compact ? " wm-empty-state--compact" : ""} ${className}`}
    >
      {icon && <Icon name={icon} />}
      {heading && <strong>{heading}</strong>}
      {children}
      {action}
    </div>
  );
}

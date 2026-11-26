import type { ComponentPropsWithRef } from "react";
import { Icon } from "./icon.js";

export interface ReorderControlsProps extends ComponentPropsWithRef<"span"> {
  label: string;
  upDisabled?: boolean;
  downDisabled?: boolean;
  disabled?: boolean;
  stopPropagation?: boolean;
  buttonClassName?: string;
  onMoveUp?(): void;
  onMoveDown?(): void;
}

export function ReorderControls({
  label,
  upDisabled = false,
  downDisabled = false,
  disabled = false,
  stopPropagation = false,
  onMoveUp,
  onMoveDown,
  buttonClassName = "",
  className = "",
  ...props
}: ReorderControlsProps) {
  return (
    <span {...props} className={`wm-reorder-controls ${className}`}>
      <button
        type="button"
        className={buttonClassName}
        aria-label={`Move ${label} up`}
        disabled={disabled || upDisabled}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          onMoveUp?.();
        }}
      >
        <Icon name="ChevronUp" />
      </button>
      <button
        type="button"
        className={buttonClassName}
        aria-label={`Move ${label} down`}
        disabled={disabled || downDisabled}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          onMoveDown?.();
        }}
      >
        <Icon name="ChevronDown" />
      </button>
    </span>
  );
}

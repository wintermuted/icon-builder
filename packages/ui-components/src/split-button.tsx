import { useEffect, useId, useRef, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { Icon } from "./icon.js";
import type { IconName } from "./icon.js";

export interface SplitButtonOption {
  value: string;
  label: string;
  icon?: IconName;
  disabled?: boolean;
}
export interface SplitButtonProps extends Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange"
> {
  options: readonly SplitButtonOption[];
  actionLabel: ReactNode;
  menuLabel: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  buttonProps?: Omit<ComponentPropsWithRef<"button">, "children" | "onClick" | "disabled" | "type">;
  menuClassName?: string;
  optionsClassName?: string;
  optionClassName?: string;
  onValueChange?(value: string): void;
  onAction?(value: string): void;
}

export function SplitButton({
  options,
  actionLabel,
  menuLabel,
  value,
  defaultValue,
  disabled = false,
  buttonProps,
  menuClassName = "",
  optionsClassName = "",
  optionClassName = "",
  onValueChange,
  onAction,
  className = "",
  ...props
}: SplitButtonProps) {
  const [selection, setSelection] = useState(defaultValue);
  const [expanded, setExpanded] = useState(false);
  const menu = useRef<HTMLDetailsElement | null>(null);
  const summary = useRef<HTMLElement | null>(null);
  const id = useId();
  const key = value ?? selection ?? options[0]?.value;
  const option = options.find((entry) => entry.value === key);
  if (key !== undefined && !option) throw new RangeError(`Unknown SplitButton option: ${key}`);
  const menuDisabled = disabled || !options.some((entry) => !entry.disabled);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.parentElement?.contains(event.target))
        if (menu.current) menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  useEffect(() => {
    if (menuDisabled && menu.current) menu.current.open = false;
  }, [menuDisabled]);
  return (
    <div {...props} className={`wm-split-button ${className}`}>
      <button
        {...buttonProps}
        type="button"
        data-value={option?.value}
        disabled={disabled || !option || option.disabled}
        onClick={() => {
          if (option) onAction?.(option.value);
        }}
      >
        {option?.icon && <Icon name={option.icon} />}
        {actionLabel}
      </button>
      <details
        ref={menu}
        className={`wm-split-button-menu ${menuClassName}`}
        onToggle={(event) => setExpanded(event.currentTarget.open)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (menu.current) menu.current.open = false;
            summary.current?.focus();
          }
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              ".wm-split-button-option:not(:disabled)",
            ),
          );
          const active = document.activeElement;
          const index = active instanceof HTMLButtonElement ? buttons.indexOf(active) : -1;
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : event.key === "ArrowDown"
                  ? (index + 1) % buttons.length
                  : event.key === "ArrowUp"
                    ? index < 0
                      ? buttons.length - 1
                      : (index - 1 + buttons.length) % buttons.length
                    : -1;
          if (next >= 0 && !menuDisabled) {
            event.preventDefault();
            if (menu.current) menu.current.open = true;
            buttons[next]?.focus();
          }
        }}
      >
        <summary
          ref={summary}
          aria-label={menuLabel}
          aria-controls={id}
          aria-expanded={expanded}
          aria-disabled={menuDisabled}
          tabIndex={menuDisabled ? -1 : undefined}
          onClick={(event) => {
            if (menuDisabled) event.preventDefault();
          }}
        >
          <Icon name="ChevronDown" />
        </summary>
        <div id={id} className={`wm-split-button-options ${optionsClassName}`}>
          {options.map((entry) => (
            <button
              key={entry.value}
              type="button"
              disabled={entry.disabled || disabled}
              data-value={entry.value}
              aria-pressed={entry.value === key}
              className={`wm-split-button-option ${optionClassName}`}
              onClick={() => {
                if (value === undefined) setSelection(entry.value);
                onValueChange?.(entry.value);
                if (menu.current) menu.current.open = false;
                summary.current?.focus();
              }}
            >
              {entry.icon && <Icon name={entry.icon} />}
              {entry.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

import { useCallback, useRef } from "react";
import type { ComponentPropsWithRef } from "react";
import { Icon } from "./icon.js";
import { stepNumber } from "./number-step.js";

export interface NumberStepperProps {
  label: string;
  value?: number;
  defaultValue?: number;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  stopPropagation?: boolean;
  className?: string;
  inputProps?: Omit<
    ComponentPropsWithRef<"input">,
    "type" | "value" | "defaultValue" | "step" | "min" | "max" | "disabled"
  >;
  onValueChange?(value: number): void;
}

export function NumberStepper({
  label,
  value,
  defaultValue,
  step = 1,
  min,
  max,
  disabled = false,
  stopPropagation = false,
  className = "",
  inputProps = {},
  onValueChange,
}: NumberStepperProps) {
  if (!Number.isFinite(step) || step <= 0)
    throw new RangeError("NumberStepper step must be positive and finite.");
  const input = useRef<HTMLInputElement | null>(null);
  const {
    ref,
    onChange,
    onClick,
    onKeyDown,
    className: inputClassName = "",
    ...nativeProps
  } = inputProps;
  const attach = useCallback(
    (element: HTMLInputElement | null) => {
      input.current = element;
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
    },
    [ref],
  );
  const move = (direction: number) => {
    if (!input.current || disabled || nativeProps.readOnly) return;
    const current = input.current.valueAsNumber;
    const next = stepNumber(current, direction, step, min, max);
    if (next === current) return;
    if (value === undefined) input.current.value = String(next);
    onValueChange?.(next);
  };
  return (
    <span className={`wm-number-stepper ${className}`}>
      <input
        {...nativeProps}
        ref={attach}
        className={`wm-number-stepper-input ${inputClassName}`}
        type="number"
        aria-label={label}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onClick={(event) => {
          if (stopPropagation) event.stopPropagation();
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          if (stopPropagation) event.stopPropagation();
          onKeyDown?.(event);
        }}
        onChange={(event) => {
          onChange?.(event);
          if (
            !event.defaultPrevented &&
            Number.isFinite(event.currentTarget.valueAsNumber) &&
            !event.currentTarget.validity.rangeUnderflow &&
            !event.currentTarget.validity.rangeOverflow
          )
            onValueChange?.(event.currentTarget.valueAsNumber);
        }}
      />
      <span className="wm-number-stepper-actions">
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || nativeProps.readOnly}
          onClick={(event) => {
            if (stopPropagation) event.stopPropagation();
            move(1);
          }}
        >
          <Icon name="ChevronUp" />
        </button>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || nativeProps.readOnly}
          onClick={(event) => {
            if (stopPropagation) event.stopPropagation();
            move(-1);
          }}
        >
          <Icon name="ChevronDown" />
        </button>
      </span>
    </span>
  );
}

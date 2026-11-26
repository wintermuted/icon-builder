import { useImperativeHandle, useRef } from "react";
import type { ComponentPropsWithRef } from "react";
import { Icon } from "./icon.js";
import { stepNumber } from "./number-step.js";

type InputProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "value" | "defaultValue" | "min" | "max" | "step" | "disabled" | "aria-label"
>;

export interface RangeNumberControlProps {
  label: string;
  inputLabel?: string;
  decreaseLabel?: string;
  increaseLabel?: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  stopPropagation?: boolean;
  className?: string;
  inputProps?: InputProps;
  sliderProps?: InputProps;
  onValueChange?(value: number): void;
}

export function RangeNumberControl({
  label,
  inputLabel = label,
  decreaseLabel = `Decrease ${label}`,
  increaseLabel = `Increase ${label}`,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  stopPropagation = false,
  className = "",
  inputProps = {},
  sliderProps = {},
  onValueChange,
}: RangeNumberControlProps) {
  if (
    !Number.isFinite(step) ||
    step <= 0 ||
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    min >= max
  )
    throw new RangeError(
      "RangeNumberControl requires finite ascending bounds and a positive finite step.",
    );
  const number = useRef<HTMLInputElement | null>(null);
  const slider = useRef<HTMLInputElement | null>(null);
  const {
    ref: numberRef,
    onChange: numberChange,
    className: numberClass = "",
    ...numberProps
  } = inputProps;
  const {
    ref: sliderRef,
    onChange: sliderChange,
    className: sliderClass = "",
    ...rangeProps
  } = sliderProps;
  useImperativeHandle(numberRef, () => {
    const element = number.current;
    if (!element) throw new Error("RangeNumberControl number input did not mount.");
    return element;
  }, []);
  useImperativeHandle(sliderRef, () => {
    const element = slider.current;
    if (!element) throw new Error("RangeNumberControl slider did not mount.");
    return element;
  }, []);
  const readOnly = numberProps.readOnly || rangeProps.readOnly;
  const update = (next: number) => {
    if (disabled || readOnly || !Number.isFinite(next) || next < min || next > max) return;
    if (value === undefined) {
      if (number.current) number.current.value = String(next);
      if (slider.current) slider.current.value = String(next);
    }
    onValueChange?.(next);
  };
  const move = (direction: number) => {
    if (!number.current) return;
    const current = number.current.valueAsNumber;
    const next = stepNumber(current, direction, step, min, max);
    if (next !== current) update(next);
  };
  const shared = {
    min,
    max,
    step,
    disabled,
    value,
    defaultValue: value === undefined ? (defaultValue ?? min) : undefined,
  };
  return (
    <span
      className={`wm-range-number-control ${className}`}
      onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}
      onKeyDown={stopPropagation ? (event) => event.stopPropagation() : undefined}
    >
      <span>{label}</span>
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={disabled || readOnly}
        onClick={() => move(-1)}
      >
        <Icon name="Minus" />
      </button>
      <input
        {...rangeProps}
        {...shared}
        ref={slider}
        type="range"
        aria-label={label}
        className={`wm-range-number-slider ${sliderClass}`}
        disabled={disabled || readOnly}
        onChange={(event) => {
          sliderChange?.(event);
          if (!event.defaultPrevented) update(event.currentTarget.valueAsNumber);
        }}
      />
      <input
        {...numberProps}
        {...shared}
        ref={number}
        type="number"
        aria-label={inputLabel}
        className={`wm-range-number-input ${numberClass}`}
        onChange={(event) => {
          numberChange?.(event);
          if (!event.defaultPrevented) update(event.currentTarget.valueAsNumber);
        }}
      />
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={disabled || readOnly}
        onClick={() => move(1)}
      >
        <Icon name="Plus" />
      </button>
    </span>
  );
}

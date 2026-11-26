import { createElement } from "react";
import { NumberStepper } from "@wm-asset-workflows/ui-components";
import type { EditorPresentation } from "./presentation.js";

export function createSteppedNumberField({
  value,
  step,
  ariaLabel,
  onChange,
  presentation,
  onMount,
}: {
  value: string;
  step: string;
  ariaLabel: string;
  onChange(value: number): void;
  presentation: EditorPresentation;
  onMount?(input: HTMLInputElement): void;
}) {
  const field = document.createElement("span");
  field.style.display = "contents";
  const initial = Number(value);
  presentation.mount(
    field,
    createElement(NumberStepper, {
      label: ariaLabel,
      defaultValue: value !== "" && Number.isFinite(initial) ? initial : undefined,
      step: Number(step),
      className: "asset-layer-attr-field",
      inputProps: { className: "asset-layer-attr-input" },
      stopPropagation: true,
      onValueChange: onChange,
    }),
  );
  presentation.afterMount(() => {
    const input = field.querySelector("input");
    if (!input) throw new Error("NumberStepper did not mount its input.");
    onMount?.(input);
  });
  return { field };
}

export function createGeometryField({ value, ariaLabel, onChange }) {
  const field = document.createElement("span");
  field.className = "asset-layer-attr-field asset-layer-attr-field--geometry";
  const input = document.createElement("textarea");
  input.className = "asset-layer-attr-input asset-layer-attr-input--geometry";
  input.rows = 3;
  input.spellcheck = false;
  input.value = value;
  input.setAttribute("aria-label", ariaLabel);
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => event.stopPropagation());
  input.addEventListener("input", () => {
    const next = input.value.trim();
    if (next) onChange(next);
  });
  field.appendChild(input);
  return { field, input };
}

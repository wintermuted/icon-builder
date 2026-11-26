export function createSteppedNumberField({ value, step, ariaLabel, onChange }) {
  const field = document.createElement("span");
  field.className = "asset-layer-attr-field";
  const input = document.createElement("input");
  input.type = "number";
  input.step = step;
  input.value = value;
  input.className = "asset-layer-attr-input";
  input.setAttribute("aria-label", ariaLabel);
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("keydown", (event) => event.stopPropagation());
  const commit = (next) => {
    input.value = String(next);
    onChange(next);
  };
  input.addEventListener("input", () => {
    const next = Number(input.value);
    if (Number.isFinite(next)) onChange(next);
  });
  const stepAmount = Number(step) || 1;
  const steppers = document.createElement("span");
  steppers.className = "asset-layer-attr-steppers";
  const upButton = document.createElement("button");
  upButton.type = "button";
  upButton.className = "asset-layer-attr-step asset-layer-attr-step--up";
  upButton.setAttribute("aria-label", `Increase ${ariaLabel}`);
  upButton.innerHTML = '<i data-lucide="chevron-up" aria-hidden="true"></i>';
  upButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = Number(input.value);
    commit((Number.isFinite(current) ? current : 0) + stepAmount);
  });
  const downButton = document.createElement("button");
  downButton.type = "button";
  downButton.className = "asset-layer-attr-step asset-layer-attr-step--down";
  downButton.setAttribute("aria-label", `Decrease ${ariaLabel}`);
  downButton.innerHTML = '<i data-lucide="chevron-down" aria-hidden="true"></i>';
  downButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = Number(input.value);
    commit((Number.isFinite(current) ? current : 0) - stepAmount);
  });
  steppers.append(upButton, downButton);
  field.append(input, steppers);
  return { field, input };
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

export function stepNumber(
  current: number,
  direction: number,
  step: number,
  min = -Infinity,
  max = Infinity,
) {
  return Math.min(
    max,
    Math.max(
      min,
      Number(((Number.isFinite(current) ? current : 0) + direction * step).toPrecision(15)),
    ),
  );
}

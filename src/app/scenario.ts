/** Bounds shared by the slider controls, the scenario generator, and message validation. */
export const MIN_DELAY = 300;
export const MAX_DELAY = 2400;
export const DELAY_STEP = 100;
export const MIN_LEVELS = 2;
export const MAX_LEVELS = 6;

/** One nested route level and the simulated request it performs. */
export interface RequestSpec {
  label: string;
  /** Simulated request latency in milliseconds. */
  duration: number;
  /** Position between the parent and child delays used to interpolate intermediate levels. */
  factor: number;
}

function roundToStep(value: number): number {
  return Math.round(value / DELAY_STEP) * DELAY_STEP;
}

function levelLabel(index: number, count: number): string {
  if (index === 0) return 'Parent';
  if (index === count - 1) return 'Child';
  return `Level ${index + 1}`;
}

function levelDuration(
  index: number,
  count: number,
  parent: number,
  child: number,
  factor: number,
): number {
  if (index === 0) return parent;
  if (index === count - 1) return child;
  return roundToStep(Math.min(parent, child) + Math.abs(parent - child) * factor);
}

/** Re-derives every duration from new parent and child delays while keeping labels and factors. */
export function scaleScenario(
  plan: readonly RequestSpec[],
  parent: number,
  child: number,
): RequestSpec[] {
  return plan.map((item, index) => ({
    ...item,
    duration: levelDuration(index, plan.length, parent, child, item.factor),
  }));
}

/** Creates a random hierarchy of 2–6 levels, never repeating the previous level count. */
export function createScenario(
  parent: number,
  child: number,
  previousCount?: number,
): RequestSpec[] {
  const counts = Array.from(
    { length: MAX_LEVELS - MIN_LEVELS + 1 },
    (_, i) => MIN_LEVELS + i,
  ).filter((count) => count !== previousCount);
  const count = counts[Math.floor(Math.random() * counts.length)];
  const shape = Array.from({ length: count }, (_, index) => ({
    label: levelLabel(index, count),
    factor: Math.random(),
    duration: 0,
  }));
  return scaleScenario(shape, parent, child);
}

function isRequestSpec(value: unknown): value is RequestSpec {
  if (typeof value !== 'object' || value === null) return false;
  const { label, duration, factor } = value as Record<string, unknown>;
  return (
    typeof label === 'string' &&
    typeof duration === 'number' &&
    Number.isFinite(duration) &&
    duration >= MIN_DELAY &&
    duration <= MAX_DELAY &&
    typeof factor === 'number'
  );
}

/** Validates a plan received from another window before it drives navigation. */
export function isRequestPlan(value: unknown): value is RequestSpec[] {
  return (
    Array.isArray(value) &&
    value.length >= MIN_LEVELS &&
    value.length <= MAX_LEVELS &&
    value.every(isRequestSpec)
  );
}

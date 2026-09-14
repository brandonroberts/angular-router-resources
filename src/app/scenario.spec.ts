import { MAX_LEVELS, MIN_LEVELS, createScenario, isRequestPlan, scaleScenario } from './scenario';

describe('scenario', () => {
  it('scales intermediate levels between the parent and child delays', () => {
    const plan = [
      { label: 'Parent', duration: 0, factor: 0 },
      { label: 'Level 2', duration: 0, factor: 0.5 },
      { label: 'Child', duration: 0, factor: 1 },
    ];
    expect(scaleScenario(plan, 400, 1200).map((item) => item.duration)).toEqual([400, 800, 1200]);
    expect(scaleScenario(plan, 1200, 400).map((item) => item.duration)).toEqual([1200, 800, 400]);
  });

  it('keeps labels and factors when rescaling', () => {
    const plan = createScenario(800, 1200);
    const scaled = scaleScenario(plan, 300, 2400);
    expect(scaled.map((item) => item.label)).toEqual(plan.map((item) => item.label));
    expect(scaled.map((item) => item.factor)).toEqual(plan.map((item) => item.factor));
  });

  it('labels the first and last levels as parent and child', () => {
    const plan = createScenario(800, 1200);
    expect(plan[0].label).toBe('Parent');
    expect(plan.at(-1)?.label).toBe('Child');
    expect(plan.length).toBeGreaterThanOrEqual(MIN_LEVELS);
    expect(plan.length).toBeLessThanOrEqual(MAX_LEVELS);
  });

  it('accepts only plans within the supported bounds', () => {
    expect(isRequestPlan(createScenario(300, 2400))).toBe(true);
    expect(isRequestPlan([])).toBe(false);
    expect(isRequestPlan([{ label: 'Parent', duration: 300, factor: 0 }])).toBe(false);
    expect(
      isRequestPlan([
        { label: 'Parent', duration: 100, factor: 0 },
        { label: 'Child', duration: 300, factor: 1 },
      ]),
    ).toBe(false);
    expect(isRequestPlan([{ label: 'Parent', duration: 300, factor: 0 }, null])).toBe(false);
    expect(isRequestPlan('nope')).toBe(false);
  });
});

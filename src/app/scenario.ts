export interface RequestSpec {
  label: string;
  duration: number;
  factor: number;
}

export function createScenario(parent: number, child: number, previousCount?: number): RequestSpec[] {
  const counts = [2, 3, 4, 5, 6].filter(count => count !== previousCount);
  const count = counts[Math.floor(Math.random() * counts.length)];
  return Array.from({length: count}, (_, index) => {
    const factor = Math.random();
    return {
      label: index === 0 ? 'Parent' : index === count - 1 ? 'Child' : `Level ${index + 1}`,
      factor,
      duration: index === 0 ? parent : index === count - 1 ? child : Math.round((Math.min(parent, child) + Math.abs(parent - child) * factor) / 100) * 100,
    };
  });
}

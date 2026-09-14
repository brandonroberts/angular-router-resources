import { DOCUMENT, InjectionToken, inject } from '@angular/core';

export const DEMO_MODES = ['resolver', 'resources'] as const;

/** Which data-fetching strategy a panel iframe demonstrates. */
export type DemoMode = (typeof DEMO_MODES)[number];

export function isDemoMode(value: unknown): value is DemoMode {
  return DEMO_MODES.includes(value as DemoMode);
}

/** Reads the `demo` query parameter that turns the application into a single router panel. */
export function readDemoMode(search: string): DemoMode | null {
  const value = new URLSearchParams(search).get('demo');
  return isDemoMode(value) ? value : null;
}

/** The mode of the current panel instance, resolved from the document URL. */
export const DEMO_MODE = new InjectionToken<DemoMode>('DEMO_MODE', {
  providedIn: 'root',
  factory: () => readDemoMode(inject(DOCUMENT).location?.search ?? '') ?? 'resolver',
});

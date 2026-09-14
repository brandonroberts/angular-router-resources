import { isDemoMode, type DemoMode } from './demo-mode';
import { isRequestPlan, type RequestSpec } from './scenario';

/** Sent by the shell page to a panel iframe. */
export interface PanelCommand {
  type: 'configure' | 'play';
  plan: RequestSpec[];
}

/** Sent by a panel iframe to the shell page. */
export type PanelEvent =
  { type: 'ready'; mode: DemoMode } | { type: 'height'; mode: DemoMode; height: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isPanelCommand(value: unknown): value is PanelCommand {
  return (
    isRecord(value) &&
    (value['type'] === 'configure' || value['type'] === 'play') &&
    isRequestPlan(value['plan'])
  );
}

export function isPanelEvent(value: unknown): value is PanelEvent {
  if (!isRecord(value) || !isDemoMode(value['mode'])) return false;
  if (value['type'] === 'ready') return true;
  return (
    value['type'] === 'height' &&
    typeof value['height'] === 'number' &&
    Number.isFinite(value['height'])
  );
}

import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import type { RequestSpec } from './scenario';

/** The payload a simulated request resolves with. */
export interface RequestData {
  label: string;
  message: string;
  duration: number;
}

export type DemoPhase = 'idle' | 'loading' | 'done' | 'error';

/**
 * Instrumentation for one panel: the current plan, per-request progress, and the run phase.
 * It only observes the requests Angular starts; it never decides when they run.
 */
@Injectable({ providedIn: 'root' })
export class DemoState {
  readonly plan = signal<RequestSpec[]>([]);
  /** True once a routed level component, rather than the previous route, is active. */
  readonly active = signal(false);
  readonly elapsed = signal(0);
  readonly phase = signal<DemoPhase>('idle');
  readonly progress = signal<number[]>([]);
  readonly completed = signal<boolean[]>([]);
  readonly error = signal('');

  private starts: (number | null)[] = [];
  private beginning = 0;
  private frame = 0;
  private controller = new AbortController();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  /** Aborts any in-flight run and prepares instrumentation for a new plan. */
  reset(plan: RequestSpec[]) {
    this.cancel();
    this.controller = new AbortController();
    this.plan.set(plan);
    this.active.set(false);
    this.elapsed.set(0);
    this.phase.set('idle');
    this.error.set('');
    this.progress.set(plan.map(() => 0));
    this.completed.set(plan.map(() => false));
    this.starts = plan.map(() => null);
  }

  /** Starts the clock; progress is measured from each request's actual start. */
  begin() {
    this.beginning = performance.now();
    this.phase.set('loading');
    const tick = () => {
      const now = performance.now();
      this.elapsed.set(Math.round(now - this.beginning));
      this.progress.set(this.plan().map((item, i) => this.progressOf(i, item, now)));
      if (this.completed().every(Boolean) && this.active()) {
        this.phase.set('done');
      } else if (this.phase() === 'loading') {
        this.frame = requestAnimationFrame(tick);
      }
    };
    this.frame = requestAnimationFrame(tick);
  }

  fail(error: unknown) {
    this.error.set(error instanceof Error ? error.message : 'Navigation failed');
    this.phase.set('error');
  }

  /** Simulates the request for one level; cancelled by a scenario reset or by Angular's signal. */
  load(index: number, resourceAbort?: AbortSignal): Promise<RequestData> {
    const signal = resourceAbort
      ? AbortSignal.any([this.controller.signal, resourceAbort])
      : this.controller.signal;
    this.starts[index] = performance.now();
    return new Promise((resolve, reject) => {
      const cancelled = () => new DOMException('Cancelled', 'AbortError');
      if (signal.aborted) {
        reject(cancelled());
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(cancelled());
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        this.completed.update((values) => values.map((value, i) => (i === index ? true : value)));
        const request = this.plan()[index];
        resolve({
          label: request.label,
          duration: request.duration,
          message: `Loaded in ${request.duration} ms`,
        });
      }, this.plan()[index].duration);
      signal.addEventListener('abort', abort, { once: true });
    });
  }

  private progressOf(index: number, item: RequestSpec, now: number): number {
    if (this.completed()[index]) return 100;
    const start = this.starts[index];
    if (start == null) return 0;
    return Math.min(99, Math.floor(((now - start) / item.duration) * 100));
  }

  private cancel() {
    this.controller.abort();
    cancelAnimationFrame(this.frame);
  }
}

import { Injectable, signal } from '@angular/core';
import type { RequestSpec } from './scenario';

export interface RequestData { label: string; message: string; duration: number; }

@Injectable({providedIn: 'root'})
export class DemoState {
  readonly plan = signal<RequestSpec[]>([]);
  readonly active = signal(false);
  readonly elapsed = signal(0);
  readonly phase = signal<'idle' | 'loading' | 'done' | 'error'>('idle');
  readonly progress = signal<number[]>([]);
  readonly completed = signal<boolean[]>([]);
  readonly error = signal('');
  private starts: (number | null)[] = [];
  private beginning = 0;
  private frame = 0;
  private controller = new AbortController();

  reset(plan: RequestSpec[]) {
    this.controller.abort();
    cancelAnimationFrame(this.frame);
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
  begin() {
    this.beginning = performance.now();
    this.phase.set('loading');
    const tick = () => {
      const now = performance.now();
      this.elapsed.set(Math.round(now - this.beginning));
      this.progress.set(this.plan().map((item, i) => this.completed()[i] ? 100 : this.starts[i] == null ? 0 : Math.min(99, Math.floor((now - this.starts[i]!) / item.duration * 100))));
      if (this.completed().every(Boolean) && this.active()) {
        this.phase.set('done');
      } else if (this.phase() === 'loading') {
        this.frame = requestAnimationFrame(tick);
      }
    };
    this.frame = requestAnimationFrame(tick);
  }
  load(index: number, resourceAbort?: AbortSignal): Promise<RequestData> {
    const signal = resourceAbort ? AbortSignal.any([this.controller.signal, resourceAbort]) : this.controller.signal;
    this.starts[index] = performance.now();
    return new Promise((resolve, reject) => {
      if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        this.completed.update(values => values.map((value, i) => i === index ? true : value));
        const request = this.plan()[index];
        resolve({label: request.label, duration: request.duration, message: `Loaded in ${request.duration} ms`});
      }, this.plan()[index].duration);
      signal.addEventListener('abort', abort, {once: true});
    });
  }
  destroy() { this.controller.abort(); cancelAnimationFrame(this.frame); }
}

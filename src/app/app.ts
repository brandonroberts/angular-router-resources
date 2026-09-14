import { Component, HostListener, signal } from '@angular/core';
import { createScenario, type RequestSpec } from './scenario';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly parentDelay = signal(800);
  readonly childDelay = signal(1200);
  readonly plan = signal(createScenario(800, 1200));
  readonly played = signal({resolver: false, resources: false});
  readonly heights = signal({resolver: 640, resources: 640});
  readonly ready = signal({resolver: false, resources: false});
  readonly version = '22.2.0-next.7';
  private frames: Partial<Record<'resolver' | 'resources', Window>> = {};

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    if (event.origin !== location.origin) return;
    const mode: unknown = event.data?.mode;
    if (mode !== 'resolver' && mode !== 'resources') return;
    const frame = document.getElementById(mode + '-frame') as HTMLIFrameElement | null;
    if (event.source !== frame?.contentWindow) return;
    if (event.data.type === 'ready') {
      this.frames[mode] = frame.contentWindow!;
      this.ready.update(value => ({...value, [mode]: true}));
      this.send(mode, 'configure');
    }
    if (event.data.type === 'height' && Number.isFinite(event.data.height)) {
      this.heights.update(value => ({...value, [mode]: Math.max(400, Math.min(1600, event.data.height))}));
    }
  }

  setDelay(which: 'parent' | 'child', event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    (which === 'parent' ? this.parentDelay : this.childDelay).set(value);
    const old = this.plan();
    const low = Math.min(this.parentDelay(), this.childDelay());
    const high = Math.max(this.parentDelay(), this.childDelay());
    this.plan.set(old.map((item, index): RequestSpec => ({...item, duration: index === 0 ? this.parentDelay() : index === old.length - 1 ? this.childDelay() : Math.round((low + (high - low) * item.factor) / 100) * 100})));
    this.configure();
  }
  randomize() {
    this.plan.set(createScenario(this.parentDelay(), this.childDelay(), this.plan().length));
    this.configure();
  }
  play(mode: 'resolver' | 'resources') {
    this.played.update(value => ({...value, [mode]: true}));
    this.send(mode, 'play');
  }
  private configure() {
    this.played.set({resolver: false, resources: false});
    this.send('resolver', 'configure');
    this.send('resources', 'configure');
  }
  private send(mode: 'resolver' | 'resources', type: string) {
    this.frames[mode]?.postMessage({type, plan: this.plan()}, location.origin);
  }
}

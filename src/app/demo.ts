import { AfterViewInit, Component, HostListener, OnDestroy, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { DemoState } from './demo-state';
import type { RequestSpec } from './scenario';
import { PreviousRoute } from './route-views';
import { createDemoRoutes } from './demo.routes';

@Component({selector: 'app-root', imports: [RouterOutlet], templateUrl: './demo.html'})
export class Demo implements AfterViewInit, OnDestroy {
  readonly state = inject(DemoState);
  readonly router = inject(Router);
  readonly mode = new URLSearchParams(location.search).get('demo') === 'resources' ? 'resources' : 'resolver';
  readonly blocking = this.mode === 'resolver';
  readonly total = computed(() => this.blocking ? this.state.plan().reduce((sum, item) => sum + item.duration, 0) : Math.max(0, ...this.state.plan().map(item => item.duration)));
  readonly status = computed(() => this.state.phase() === 'idle' ? 'Ready' : this.state.phase() === 'error' ? 'Error' : this.state.phase() === 'done' ? 'Data ready' : this.state.active() ? 'Route active' : 'Resolving');
  private observer?: ResizeObserver;
  private sequence = 0;
  private generation = 0;

  onActivate(component: unknown) { this.state.active.set(!(component instanceof PreviousRoute)); }

  ngAfterViewInit() {
    const panel = document.querySelector('.panel')!;
    this.observer = new ResizeObserver(() => parent.postMessage({type: 'height', mode: this.mode, height: panel.getBoundingClientRect().height + 2}, location.origin));
    this.observer.observe(panel);
    parent.postMessage({type: 'ready', mode: this.mode}, location.origin);
  }
  ngOnDestroy() { this.observer?.disconnect(); this.state.destroy(); }

  @HostListener('window:message', ['$event'])
  async onMessage(event: MessageEvent) {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (!['configure', 'play'].includes(event.data?.type)) return;
    const plan = event.data.plan as RequestSpec[];
    if (!Array.isArray(plan) || plan.length < 2 || plan.length > 6 || plan.some(item => !item || typeof item.label !== 'string' || !Number.isFinite(item.duration) || item.duration < 300 || item.duration > 2400)) return;
    await this.start(plan, event.data.type === 'play');
  }
  async start(plan: RequestSpec[], play: boolean) {
    const generation = ++this.generation;
    // An idle navigation tears down any previous route resources before replay.
    this.router.resetConfig([{path: '', component: PreviousRoute}]);
    await this.router.navigateByUrl('/', {skipLocationChange: true});
    if (generation !== this.generation) return;
    this.state.reset(plan);
    if (!play) return;
    const {routes, url} = createDemoRoutes(plan, this.mode, ++this.sequence);
    this.router.resetConfig(routes);
    this.state.begin();
    try {
      await this.router.navigateByUrl(url, {skipLocationChange: true});
    } catch (error) {
      if (generation !== this.generation) return;
      this.state.error.set(error instanceof Error ? error.message : 'Navigation failed');
      this.state.phase.set('error');
    }
  }
}

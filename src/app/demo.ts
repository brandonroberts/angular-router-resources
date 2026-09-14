import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { DEMO_MODE, type DemoMode } from './demo-mode';
import { DemoState } from './demo-state';
import { createDemoRoutes } from './demo.routes';
import { isPanelCommand, type PanelEvent } from './panel-messages';
import { PreviousRoute } from './previous-route';
import type { RequestSpec } from './scenario';

/** Border added by the shell's iframe styling so the reported height fits the panel exactly. */
const PANEL_BORDER = 2;

interface PanelCopy {
  heading: string;
  description: string;
  /** Singular noun for one level's request. */
  unit: string;
  formula: string;
}

const PANEL_COPY: Record<DemoMode, PanelCopy> = {
  resolver: {
    heading: 'Blocking resolvers',
    description:
      'One resolver per nested route. Angular resolves parent before child and waits for every level before activating.',
    unit: 'resolver',
    formula: 'activation ≈ sum(nested request times)',
  },
  resources: {
    heading: 'Non-blocking router resources',
    description:
      'One independent resource per nested route, wrapped in nonBlocking(). Angular starts them concurrently without waiting for data to activate.',
    unit: 'resource',
    formula: 'all data ready ≈ max(independent request times)',
  },
};

/** One router panel, rendered inside an iframe so its navigation is isolated from the other panel. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './demo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:message)': 'onMessage($event)' },
})
export class Demo {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  readonly state = inject(DemoState);
  readonly mode = inject(DEMO_MODE);
  protected readonly blocking = this.mode === 'resolver';
  protected readonly copy = PANEL_COPY[this.mode];

  protected readonly total = computed(() => {
    const durations = this.state.plan().map((item) => item.duration);
    return this.blocking
      ? durations.reduce((sum, value) => sum + value, 0)
      : Math.max(0, ...durations);
  });
  protected readonly expectation = computed(() =>
    this.blocking ? `≈ ${this.total()} ms before activation` : 'Non-blocking activation',
  );
  protected readonly sequence = computed(() =>
    this.blocking
      ? `${this.state.plan().length} nested requests → activate route`
      : 'Start resources → activate without waiting → render results',
  );
  protected readonly status = computed(() => {
    switch (this.state.phase()) {
      case 'idle':
        return 'Ready';
      case 'error':
        return 'Error';
      case 'done':
        return 'Data ready';
      default:
        return this.state.active() ? 'Route active' : 'Resolving';
    }
  });
  protected readonly statusClass = computed(() => {
    switch (this.state.phase()) {
      case 'idle':
        return 'idle';
      case 'done':
        return 'done';
      case 'loading':
        return this.blocking ? 'waiting' : 'active';
      default:
        return '';
    }
  });

  private sequenceNumber = 0;
  private generation = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const panel = this.panel().nativeElement;
      const observer = new ResizeObserver(() =>
        this.notify({
          type: 'height',
          mode: this.mode,
          height: panel.getBoundingClientRect().height + PANEL_BORDER,
        }),
      );
      observer.observe(panel);
      destroyRef.onDestroy(() => observer.disconnect());
      this.notify({ type: 'ready', mode: this.mode });
    });
  }

  protected onActivate(component: unknown) {
    this.state.active.set(!(component instanceof PreviousRoute));
  }

  /** Accepts commands only from the same-origin parent window that embeds this panel. */
  onMessage(event: MessageEvent<unknown>) {
    const window = this.document.defaultView;
    if (!window || event.origin !== window.location.origin || event.source !== window.parent)
      return;
    if (!isPanelCommand(event.data)) return;
    void this.start(event.data.plan, event.data.type === 'play');
  }

  /** Returns to the previous route, installs the plan's routes, and optionally navigates through them. */
  async start(plan: RequestSpec[], play: boolean) {
    const generation = ++this.generation;
    // An idle navigation tears down any previous route resources before replay.
    this.router.resetConfig([{ path: '', component: PreviousRoute }]);
    await this.router.navigateByUrl('/', { skipLocationChange: true });
    if (generation !== this.generation) return;
    this.state.reset(plan);
    if (!play) return;
    const { routes, url } = createDemoRoutes(plan, this.mode, ++this.sequenceNumber);
    this.router.resetConfig(routes);
    this.state.begin();
    try {
      await this.router.navigateByUrl(url, { skipLocationChange: true });
    } catch (error) {
      if (generation === this.generation) this.state.fail(error);
    }
  }

  private notify(message: PanelEvent) {
    const window = this.document.defaultView;
    window?.parent.postMessage(message, window.location.origin);
  }
}

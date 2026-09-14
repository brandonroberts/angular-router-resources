import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  VERSION,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { DemoMode } from './demo-mode';
import { isPanelEvent, type PanelCommand } from './panel-messages';
import { DELAY_STEP, MAX_DELAY, MIN_DELAY, createScenario, scaleScenario } from './scenario';

const DEFAULT_PARENT_DELAY = 800;
const DEFAULT_CHILD_DELAY = 1200;
const MIN_FRAME_HEIGHT = 400;
const MAX_FRAME_HEIGHT = 1600;
const DEFAULT_FRAME_HEIGHT = 640;

type PerMode<T> = Record<DemoMode, T>;

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:message)': 'onMessage($event)' },
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly resolverFrame =
    viewChild.required<ElementRef<HTMLIFrameElement>>('resolverFrame');
  private readonly resourcesFrame =
    viewChild.required<ElementRef<HTMLIFrameElement>>('resourcesFrame');
  private readonly frames = new Map<DemoMode, Window>();

  protected readonly version = VERSION.full;
  protected readonly minDelay = MIN_DELAY;
  protected readonly maxDelay = MAX_DELAY;
  protected readonly delayStep = DELAY_STEP;

  protected readonly parentDelay = signal(DEFAULT_PARENT_DELAY);
  protected readonly childDelay = signal(DEFAULT_CHILD_DELAY);
  private readonly shape = signal(createScenario(DEFAULT_PARENT_DELAY, DEFAULT_CHILD_DELAY));
  /** The plan both panels run: the random shape scaled to the current slider values. */
  readonly plan = computed(() =>
    scaleScenario(this.shape(), this.parentDelay(), this.childDelay()),
  );

  protected readonly ready = signal<PerMode<boolean>>({ resolver: false, resources: false });
  protected readonly played = signal<PerMode<boolean>>({ resolver: false, resources: false });
  protected readonly heights = signal<PerMode<number>>({
    resolver: DEFAULT_FRAME_HEIGHT,
    resources: DEFAULT_FRAME_HEIGHT,
  });

  /** Accepts messages only from the two same-origin panel iframes this page created. */
  onMessage(event: MessageEvent<unknown>) {
    if (event.origin !== this.origin || !isPanelEvent(event.data)) return;
    const message = event.data;
    const frame = this.frameFor(message.mode).contentWindow;
    if (!frame || event.source !== frame) return;

    switch (message.type) {
      case 'ready':
        this.frames.set(message.mode, frame);
        this.ready.update((value) => ({ ...value, [message.mode]: true }));
        this.send(message.mode, 'configure');
        break;
      case 'height':
        this.heights.update((value) => ({
          ...value,
          [message.mode]: Math.max(MIN_FRAME_HEIGHT, Math.min(MAX_FRAME_HEIGHT, message.height)),
        }));
        break;
    }
  }

  protected setDelay(which: 'parent' | 'child', event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    (which === 'parent' ? this.parentDelay : this.childDelay).set(value);
    this.configure();
  }

  protected randomize() {
    this.shape.set(createScenario(this.parentDelay(), this.childDelay(), this.plan().length));
    this.configure();
  }

  protected play(mode: DemoMode) {
    this.played.update((value) => ({ ...value, [mode]: true }));
    this.send(mode, 'play');
  }

  private configure() {
    this.played.set({ resolver: false, resources: false });
    this.send('resolver', 'configure');
    this.send('resources', 'configure');
  }

  private send(mode: DemoMode, type: PanelCommand['type']) {
    const command: PanelCommand = { type, plan: this.plan() };
    this.frames.get(mode)?.postMessage(command, this.origin);
  }

  private frameFor(mode: DemoMode): HTMLIFrameElement {
    return (mode === 'resolver' ? this.resolverFrame : this.resourcesFrame)().nativeElement;
  }

  private get origin(): string {
    return this.document.location?.origin ?? '';
  }
}

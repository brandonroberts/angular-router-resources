import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DemoState } from './demo-state';

/** The route that stays on screen while a blocking navigation is pending. */
@Component({
  selector: 'app-previous-route',
  template: `
    <div class="old-view">
      <div>
        <strong>Previous route stays visible</strong>
        <div class="muted">{{ hint() }}</div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviousRoute {
  private readonly state = inject(DemoState);

  protected hint(): string {
    return this.state.phase() === 'idle'
      ? 'Press play to navigate.'
      : 'The dashboard is not mounted yet.';
  }
}

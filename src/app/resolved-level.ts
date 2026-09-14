import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import type { RequestData } from './demo-state';

/** One nested route level whose data arrived through a `resolve` function. */
@Component({
  selector: 'app-resolved-level',
  imports: [RouterOutlet],
  template: `
    @if (level() === 0) {
      <div class="view-title">
        <strong>Dashboard</strong><span class="route-state">Resolved data rendered</span>
      </div>
    }
    <div class="data-row">
      <span class="data-label">{{ request().label }} data</span>
      <span class="ready">{{ request().message }}</span>
    </div>
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResolvedLevel {
  readonly level = input.required<number>();
  readonly request = input.required<RequestData>();
}

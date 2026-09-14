import { ChangeDetectionStrategy, Component, input, type Resource } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import type { RequestData } from './demo-state';

/** One nested route level that renders the loading, error, and value states of its route resource. */
@Component({
  selector: 'app-resource-level',
  imports: [RouterOutlet],
  template: `
    @if (level() === 0) {
      <div class="view-title">
        <strong>Dashboard</strong><span class="route-state">Resource signals rendered</span>
      </div>
    }
    <div class="data-row">
      <span class="data-label">{{ label() }} data</span>
      @if (request().isLoading()) {
        <span class="skeleton" aria-label="Loading"></span>
      } @else if (request().error()) {
        <span class="error" role="alert">Could not load data</span>
      } @else if (request().hasValue()) {
        <span class="ready">{{ request().value()?.message }}</span>
      }
    </div>
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceLevel {
  readonly level = input.required<number>();
  readonly label = input.required<string>();
  readonly request = input.required<Resource<RequestData | undefined>>();
}

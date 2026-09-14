import { Component, inject, input, type Resource } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoState, type RequestData } from './demo-state';

@Component({
  selector: 'app-previous-route',
  template: `<div class="old-view"><div><strong>Previous route stays visible</strong>
    <div class="muted">{{ state.phase() === 'idle' ? 'Press play to navigate.' : 'The dashboard is not mounted yet.' }}</div>
  </div></div>`,
})
export class PreviousRoute { readonly state = inject(DemoState); }

@Component({
  selector: 'app-resolved-level',
  imports: [RouterOutlet],
  template: `
    @if (level() === 0) { <div class="view-title"><strong>Dashboard</strong><span class="route-state">Resolved data rendered</span></div> }
    <div class="data-row"><span class="data-label">{{ request().label }} data</span><span class="ready">{{ request().message }}</span></div>
    <router-outlet />`,
})
export class ResolvedLevel {
  readonly level = input.required<number>();
  readonly request = input.required<RequestData>();
}

@Component({
  selector: 'app-resource-level',
  imports: [RouterOutlet],
  template: `
    @if (level() === 0) { <div class="view-title"><strong>Dashboard</strong><span class="route-state">Resource signals rendered</span></div> }
    <div class="data-row">
      <span class="data-label">{{ label() }} data</span>
      @if (request().isLoading()) { <span class="skeleton" aria-label="Loading"></span> }
      @else if (request().error()) { <span class="error" role="alert">Could not load data</span> }
      @else if (request().hasValue()) { <span class="ready">{{ request().value()?.message }}</span> }
    </div>
    <router-outlet />`,
})
export class ResourceLevel {
  readonly level = input.required<number>();
  readonly label = input.required<string>();
  readonly request = input.required<Resource<RequestData | undefined>>();
}

import { inject, resource } from '@angular/core';
import { nonBlocking, type ResolveFn, type Routes } from '@angular/router';
import { Observable } from 'rxjs';
import { DemoState, type RequestData } from './demo-state';
import { PreviousRoute, ResolvedLevel, ResourceLevel } from './route-views';
import type { RequestSpec } from './scenario';

// The router subscribes and unsubscribes: cancelling navigation cancels the request.
export function requestResolver(index: number): ResolveFn<RequestData> {
  return () => {
    const requests = inject(DemoState);
    return new Observable<RequestData>(subscriber => {
      const controller = new AbortController();
      requests.load(index, controller.signal).then(
        value => { subscriber.next(value); subscriber.complete(); },
        error => subscriber.error(error),
      );
      return () => controller.abort();
    });
  };
}

// One request per nested route, matching the levels and durations in the UI.
// No orchestration of request order here: Angular controls when each starts.
export function createDemoRoutes(plan: RequestSpec[], mode: 'resolver' | 'resources', run: number) {
  const segments = plan.map((_, index) => index === 0 ? `run-${run}` : `level-${index}`);
  let children: Routes = [];
  for (let index = plan.length - 1; index >= 0; index--) {
    children = [{
      path: segments[index],
      data: {level: index, label: plan[index].label},
      ...(mode === 'resolver' ? {
        component: ResolvedLevel,
        resolve: {request: requestResolver(index)},
      } : {
        component: ResourceLevel,
        resources: () => {
          const requests = inject(DemoState);
          return {request: nonBlocking(resource({
            loader: ({abortSignal}) => requests.load(index, abortSignal),
          }))};
        },
      }),
      children,
    }];
  }
  return {routes: [{path: '', pathMatch: 'full', component: PreviousRoute}, ...children] satisfies Routes, url: '/' + segments.join('/')};
}

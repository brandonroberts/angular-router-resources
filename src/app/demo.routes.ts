import { inject, resource } from '@angular/core';
import { nonBlocking, type ResolveFn, type Route, type Routes } from '@angular/router';
import { Observable } from 'rxjs';
import type { DemoMode } from './demo-mode';
import { DemoState, type RequestData } from './demo-state';
import { PreviousRoute } from './previous-route';
import { ResolvedLevel } from './resolved-level';
import { ResourceLevel } from './resource-level';
import type { RequestSpec } from './scenario';

/** The router subscribes and unsubscribes: cancelling the navigation cancels the request. */
export function requestResolver(index: number): ResolveFn<RequestData> {
  return () => {
    const requests = inject(DemoState);
    return new Observable<RequestData>((subscriber) => {
      const controller = new AbortController();
      requests.load(index, controller.signal).then(
        (value) => {
          subscriber.next(value);
          subscriber.complete();
        },
        (error) => subscriber.error(error),
      );
      return () => controller.abort();
    });
  };
}

function resolverLevel(index: number): Pick<Route, 'component' | 'resolve'> {
  return { component: ResolvedLevel, resolve: { request: requestResolver(index) } };
}

function resourceLevel(index: number): Pick<Route, 'component' | 'resources'> {
  return {
    component: ResourceLevel,
    resources: () => {
      const requests = inject(DemoState);
      return {
        request: nonBlocking(
          resource({ loader: ({ abortSignal }) => requests.load(index, abortSignal) }),
        ),
      };
    },
  };
}

/**
 * Builds one nested route per plan level, matching the levels and durations shown in the UI.
 * Nothing here orchestrates request order: Angular decides when each resolver or resource starts.
 */
export function createDemoRoutes(plan: RequestSpec[], mode: DemoMode, run: number) {
  const segments = plan.map((_, index) => (index === 0 ? `run-${run}` : `level-${index}`));
  let children: Routes = [];
  for (let index = plan.length - 1; index >= 0; index--) {
    children = [
      {
        path: segments[index],
        data: { level: index, label: plan[index].label },
        ...(mode === 'resolver' ? resolverLevel(index) : resourceLevel(index)),
        children,
      },
    ];
  }
  const routes: Routes = [{ path: '', pathMatch: 'full', component: PreviousRoute }, ...children];
  return { routes, url: '/' + segments.join('/') };
}

import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  withComponentInputBinding,
  withDisabledInitialNavigation,
  withRouterResources,
} from '@angular/router';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Demo } from './demo';
import { createScenario } from './scenario';
import { ResolvedLevel } from './resolved-level';
import { ResourceLevel } from './resource-level';
import { createDemoRoutes } from './demo.routes';

describe('Real Angular routing comparison', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    TestBed.configureTestingModule({
      imports: [Demo],
      providers: [
        provideRouter(
          [],
          withDisabledInitialNavigation(),
          withComponentInputBinding(),
          withRouterResources(),
        ),
      ],
    });
  });
  afterEach(() => {
    history.replaceState(null, '', '/');
    vi.unstubAllGlobals();
  });

  for (const mode of ['resolver', 'resources']) {
    it(mode + ' uses the actual router activation order', async () => {
      history.replaceState(null, '', '/?demo=' + mode);
      const fixture = TestBed.createComponent(Demo);
      fixture.detectChanges();
      const demo = fixture.componentInstance;
      const requests = [
        { label: 'Parent', duration: 40, factor: 0 },
        { label: 'Child', duration: 60, factor: 1 },
      ];
      const originalLoad = demo.state.load.bind(demo.state);
      const previousComplete: boolean[] = [];
      const load = vi.spyOn(demo.state, 'load').mockImplementation((index, signal) => {
        if (index === 1) previousComplete.push(demo.state.completed()[0]);
        return originalLoad(index, signal);
      });
      await demo.start(requests, true);
      fixture.detectChanges();
      expect(load).toHaveBeenCalledTimes(2);
      expect(previousComplete).toEqual([mode === 'resolver']);
      expect(demo.state.active()).toBe(true);
      const levels = fixture.debugElement.queryAll(
        By.directive(mode === 'resolver' ? ResolvedLevel : ResourceLevel),
      );
      expect(levels.length).toBe(requests.length);
      if (mode === 'resolver') {
        expect(demo.state.completed()).toEqual([true, true]);
        expect(levels[0].componentInstance.request()).toEqual({
          label: 'Parent',
          duration: 40,
          message: 'Loaded in 40 ms',
        });
      } else {
        // Navigation activates without waiting for either resource.
        expect(demo.state.completed().every(Boolean)).toBe(false);
        expect(levels[0].componentInstance.request().isLoading()).toBe(true);
        expect(fixture.nativeElement.querySelectorAll('.skeleton').length).toBe(2);
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
      fixture.detectChanges();
      expect(demo.state.completed()).toEqual([true, true]);
      expect(demo.state.phase()).toBe('done');
      expect(fixture.nativeElement.querySelectorAll('.data-row').length).toBe(2);
      expect(fixture.nativeElement.textContent).toContain('Loaded in 40 ms');
      expect(fixture.nativeElement.textContent).toContain('Loaded in 60 ms');
      expect(fixture.nativeElement.querySelectorAll('.skeleton').length).toBe(0);
      await demo.start(requests, false);
      expect(demo.state.phase()).toBe('idle');
      expect(demo.state.active()).toBe(false);
      fixture.destroy();
    });
  }

  it('randomizes 2–6 matching route levels and changes count', () => {
    for (let i = 0; i < 30; i++) {
      const plan = createScenario(800, 1200, 3);
      expect(plan.length).toBeGreaterThanOrEqual(2);
      expect(plan.length).toBeLessThanOrEqual(6);
      expect(plan.length).not.toBe(3);
      expect(plan[0].duration).toBe(800);
      expect(plan.at(-1)?.duration).toBe(1200);
    }
  });

  it('builds the configured count of real nested route entries for each panel', () => {
    for (const count of [2, 4, 6]) {
      const plan = Array.from({ length: count }, (_, index) => ({
        label: `Level ${index}`,
        duration: 300 + index * 100,
        factor: 0,
      }));
      for (const mode of ['resolver', 'resources'] as const) {
        const { routes, url } = createDemoRoutes(plan, mode, 7);
        let level = routes[1];
        for (let index = 0; index < count; index++) {
          expect(level.data).toEqual({ level: index, label: plan[index].label });
          expect(Boolean(level.resolve)).toBe(mode === 'resolver');
          expect(Boolean(level.resources)).toBe(mode === 'resources');
          if (index < count - 1) level = level.children![0];
        }
        expect(level.children).toEqual([]);
        expect(url.split('/').filter(Boolean).length).toBe(count);
      }
    }
  });

  it('renders resource results independently while a slower resource is pending', async () => {
    history.replaceState(null, '', '/?demo=resources');
    const fixture = TestBed.createComponent(Demo);
    fixture.detectChanges();
    const demo = fixture.componentInstance;
    const completions: (() => void)[] = [];
    vi.spyOn(demo.state, 'load').mockImplementation(
      (index) =>
        new Promise((resolve) => {
          completions[index] = () =>
            resolve({
              label: index ? 'Child' : 'Parent',
              duration: 300,
              message: `Actual payload ${index}`,
            });
        }),
    );
    await demo.start(createScenario(300, 300).slice(0, 2), true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.skeleton').length).toBe(2);
    completions[1]();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.skeleton').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Actual payload 1');
    // The result came from Resource.value(), not the instrumentation flags.
    expect(demo.state.completed()).toEqual([false, false]);
    completions[0]();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Actual payload 0');
    fixture.destroy();
  });

  for (const mode of ['resolver', 'resources'])
    it('cancels an in-flight ' + mode + ' run when the scenario changes', async () => {
      history.replaceState(null, '', '/?demo=' + mode);
      const fixture = TestBed.createComponent(Demo);
      fixture.detectChanges();
      const demo = fixture.componentInstance;
      const plan = createScenario(300, 300);
      const pending = demo.start(plan, true);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await demo.start(plan, false);
      await pending;
      expect(demo.state.phase()).toBe('idle');
      expect(demo.state.active()).toBe(false);
      expect(demo.state.completed().some(Boolean)).toBe(false);
      fixture.destroy();
    });

  it('keeps the previous routed component until every nested resolver finishes', async () => {
    history.replaceState(null, '', '/?demo=resolver');
    const fixture = TestBed.createComponent(Demo);
    fixture.detectChanges();
    const demo = fixture.componentInstance;
    const completions: (() => void)[] = [];
    const load = vi.spyOn(demo.state, 'load').mockImplementation(
      (index) =>
        new Promise((resolve) => {
          completions[index] = () =>
            resolve({
              label: `Level ${index}`,
              duration: 300,
              message: `Resolver payload ${index}`,
            });
        }),
    );
    const pending = demo.start(createScenario(300, 300).slice(0, 2), true);
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-previous-route')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-resolved-level')).toBeNull();
    completions[0]();
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(demo.state.active()).toBe(false);
    completions[1]();
    await pending;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-previous-route')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-resolved-level').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Resolver payload 0');
    expect(fixture.nativeElement.textContent).toContain('Resolver payload 1');
    expect(demo.state.completed()).toEqual([false, false]);
    fixture.destroy();
  });
});

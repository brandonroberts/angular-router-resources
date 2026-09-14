import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { vi } from 'vitest';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Data Fetching');
  });

  it('sends the slider configuration to both routers and plays each independently', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const resolver = (root.querySelector('#resolver-frame') as HTMLIFrameElement).contentWindow!;
    const resources = (root.querySelector('#resources-frame') as HTMLIFrameElement).contentWindow!;
    const resolverMessage = vi.spyOn(resolver, 'postMessage');
    const resourceMessage = vi.spyOn(resources, 'postMessage');
    for (const [mode, source] of [['resolver', resolver], ['resources', resources]] as const) {
      app.onMessage(new MessageEvent('message', {origin: location.origin, source, data: {type: 'ready', mode}}));
    }
    const slider = root.querySelector('#parent-delay') as HTMLInputElement;
    slider.value = '1700';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(app.plan()[0].duration).toBe(1700);
    expect(resolverMessage).toHaveBeenLastCalledWith({type: 'configure', plan: app.plan()}, location.origin);
    expect(resourceMessage).toHaveBeenLastCalledWith({type: 'configure', plan: app.plan()}, location.origin);
    resolverMessage.mockClear();
    resourceMessage.mockClear();
    (root.querySelector('button.resolver') as HTMLButtonElement).click();
    expect(resolverMessage).toHaveBeenCalledExactlyOnceWith({type: 'play', plan: app.plan()}, location.origin);
    expect(resourceMessage).not.toHaveBeenCalled();
    resolverMessage.mockClear();
    (root.querySelector('button.resource') as HTMLButtonElement).click();
    expect(resourceMessage).toHaveBeenCalledExactlyOnceWith({type: 'play', plan: app.plan()}, location.origin);
    expect(resolverMessage).not.toHaveBeenCalled();
  });
});

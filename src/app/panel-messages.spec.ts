import { readDemoMode } from './demo-mode';
import { isPanelCommand, isPanelEvent } from './panel-messages';

describe('panel messages', () => {
  const plan = [
    { label: 'Parent', duration: 800, factor: 0 },
    { label: 'Child', duration: 1200, factor: 1 },
  ];

  it('recognizes commands from the shell', () => {
    expect(isPanelCommand({ type: 'configure', plan })).toBe(true);
    expect(isPanelCommand({ type: 'play', plan })).toBe(true);
    expect(isPanelCommand({ type: 'play', plan: [] })).toBe(false);
    expect(isPanelCommand({ type: 'reset', plan })).toBe(false);
    expect(isPanelCommand(null)).toBe(false);
  });

  it('recognizes events from a panel', () => {
    expect(isPanelEvent({ type: 'ready', mode: 'resolver' })).toBe(true);
    expect(isPanelEvent({ type: 'height', mode: 'resources', height: 512 })).toBe(true);
    expect(isPanelEvent({ type: 'height', mode: 'resources', height: Number.NaN })).toBe(false);
    expect(isPanelEvent({ type: 'ready', mode: 'other' })).toBe(false);
    expect(isPanelEvent('ready')).toBe(false);
  });

  it('reads the panel mode from the query string', () => {
    expect(readDemoMode('?demo=resolver')).toBe('resolver');
    expect(readDemoMode('?demo=resources')).toBe('resources');
    expect(readDemoMode('?demo=other')).toBeNull();
    expect(readDemoMode('')).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { parsePrompt, formatResult } from '../generated.js';

describe('Mini Corpus Fixture', () => {
  it('parses standard action prompt', () => {
    const res = parsePrompt('build user-service');
    expect(res.action).toBe('build');
    expect(res.target).toBe('user-service');
  });

  it('handles empty input gracefully', () => {
    const res = parsePrompt('');
    expect(res.action).toBe('noop');
    expect(res.target).toBe('none');
  });

  it('formats action and target correctly', () => {
    const formatted = formatResult('deploy', 'staging-cluster');
    expect(formatted).toBe('[DEPLOY]: staging-cluster');
  });
});

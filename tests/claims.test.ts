import { describe, it, expect } from 'vitest';
import { parseClaimsJson } from '../src/claims.js';

describe('Claims Parser', () => {
  it('parses array of valid claims', () => {
    const raw = JSON.stringify([
      { type: 'tests_pass', cmd: 'pytest' },
      { type: 'file_written', path: 'src/main.py' }
    ]);
    const claims = parseClaimsJson(raw);
    expect(claims).toHaveLength(2);
    expect(claims[0].type).toBe('tests_pass');
    expect(claims[1].type).toBe('file_written');
  });

  it('parses multi-path and glob file_written claims', () => {
    const raw = JSON.stringify([
      { type: 'file_written', paths: ['src/main.ts', 'src/types.ts'] },
      { type: 'file_written', glob: 'src/**/*.ts', minMatches: 2 }
    ]);
    const claims = parseClaimsJson(raw);
    expect(claims).toHaveLength(2);
    expect(claims[0].type).toBe('file_written');
    if (claims[0].type === 'file_written') {
      expect(claims[0].paths).toEqual(['src/main.ts', 'src/types.ts']);
    }
    if (claims[1].type === 'file_written') {
      expect(claims[1].glob).toBe('src/**/*.ts');
      expect(claims[1].minMatches).toBe(2);
    }
  });

  it('parses claims document object with claims array', () => {
    const raw = JSON.stringify({
      version: '1.0',
      claims: [
        { type: 'file_written', path: 'README.md' }
      ]
    });
    const claims = parseClaimsJson(raw);
    expect(claims).toHaveLength(1);
    expect(claims[0].type).toBe('file_written');
  });

  it('throws error for invalid JSON', () => {
    expect(() => parseClaimsJson('{ not json }')).toThrow(/Invalid JSON/);
  });

  it('throws error for invalid claim type', () => {
    const raw = JSON.stringify([{ type: 'invalid_type', path: 'foo' }]);
    expect(() => parseClaimsJson(raw)).toThrow(/Invalid claim/);
  });
});

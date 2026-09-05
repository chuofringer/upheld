import { describe, it, expect } from 'vitest';
import { add, subtract } from '../src/math.js';

describe('math operations', () => {
  it('adds two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('subtracts two numbers correctly', () => {
    expect(subtract(5, 2)).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';

import { capitalize, formatSpellLevel } from '../format';

describe('capitalize', () => {
  it('uppercases the first letter', () => {
    expect(capitalize('humanoid')).toBe('Humanoid');
    expect(capitalize('evocation')).toBe('Evocation');
  });

  it('leaves an empty string alone', () => {
    expect(capitalize('')).toBe('');
  });

  it('leaves an already-capitalized value alone', () => {
    expect(capitalize('Dragon')).toBe('Dragon');
  });
});

describe('formatSpellLevel', () => {
  it('leaves Cantrip on its own', () => {
    expect(formatSpellLevel('Cantrip')).toBe('Cantrip');
  });

  it('suffixes a numbered level with "Level"', () => {
    expect(formatSpellLevel('1st')).toBe('1st Level');
    expect(formatSpellLevel('3rd')).toBe('3rd Level');
  });
});

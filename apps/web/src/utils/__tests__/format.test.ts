import { describe, expect, it } from 'vitest';

import { formatSpellLevel } from '../format';

describe('formatSpellLevel', () => {
  it('leaves Cantrip on its own', () => {
    expect(formatSpellLevel('Cantrip')).toBe('Cantrip');
  });

  it('suffixes a numbered level with "Level"', () => {
    expect(formatSpellLevel('1st')).toBe('1st Level');
    expect(formatSpellLevel('3rd')).toBe('3rd Level');
  });
});

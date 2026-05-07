import { describe, expect, it } from 'vitest';

import { classNames } from '../class-names';

describe('classNames', () => {
  it('returns a string of class names', () => {
    const result = classNames('foo', 'bar', 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('ignores falsy values', () => {
    const result = classNames('foo', false, 'bar', null, 'baz', undefined);
    expect(result).toBe('foo bar baz');
  });

  it('handles an empty input', () => {
    const result = classNames();
    expect(result).toBe('');
  });

  it('handles an array of class names', () => {
    const result = classNames(['foo', 'bar', 'baz']);
    expect(result).toBe('foo bar baz');
  });

  it('supports nested arrays', () => {
    const result = classNames(['foo', ['bar', 'baz']]);
    expect(result).toBe('foo bar baz');
  });

  it('handles an object with boolean values', () => {
    const result = classNames({ foo: true, bar: false, baz: true });
    expect(result).toBe('foo baz');
  });

  it('handles a mix of strings, arrays, and objects', () => {
    const result = classNames(
      'foo',
      ['bar', 'baz'],
      { qux: true, quux: false },
      null,
      undefined,
    );
    expect(result).toBe('foo bar baz qux');
  });
});

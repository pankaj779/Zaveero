import { describe, expect, it } from 'vitest';
import { cn, getErrorMessage, isNonEmptyString } from './index.js';

describe('@graphology/utils', () => {
  it('merges class names with cn', () => {
    expect(cn('px-2', 'px-4', 'text-sm')).toBe('px-4 text-sm');
  });

  it('validates non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });

  it('extracts error messages', () => {
    expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    expect(getErrorMessage('Plain error')).toBe('Plain error');
    expect(getErrorMessage({ code: 500 })).toBe('An unexpected error occurred.');
  });
});

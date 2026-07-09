import { describe, expect, it } from 'vitest';
import { buttonVariants } from './button.js';

describe('@graphology/ui', () => {
  it('defines button variants', () => {
    expect(buttonVariants({ variant: 'default' })).toContain('bg-primary');
    expect(buttonVariants({ variant: 'outline' })).toContain('border');
  });
});

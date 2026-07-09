import { describe, expect, it } from 'vitest';

describe('@graphology/web', () => {
  it('workspace is configured', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

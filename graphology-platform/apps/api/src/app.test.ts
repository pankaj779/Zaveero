import { describe, expect, it } from 'vitest';

describe('@graphology/api', () => {
  it('workspace is configured', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

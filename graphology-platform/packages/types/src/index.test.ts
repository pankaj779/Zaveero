import { describe, expect, it } from 'vitest';
import type { ApiSuccessResponse } from './index.js';

describe('@graphology/types', () => {
  it('defines ApiSuccessResponse shape', () => {
    const response: ApiSuccessResponse<{ id: string }> = {
      success: true,
      message: 'Operation completed successfully.',
      data: { id: '00000000-0000-0000-0000-000000000001' },
    };

    expect(response.success).toBe(true);
    expect(response.data.id).toBe('00000000-0000-0000-0000-000000000001');
  });
});

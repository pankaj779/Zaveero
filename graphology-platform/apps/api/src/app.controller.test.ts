import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller';
import { HealthController } from './health.controller';

describe('AppController', () => {
  const controller = new AppController();

  it('returns root service metadata', () => {
    expect(controller.getRoot()).toEqual({
      service: 'Graphology Platform API',
      status: 'running',
      version: '0.1.0',
    });
  });
});

describe('HealthController', () => {
  const controller = new HealthController();

  it('returns health status', () => {
    const response = controller.getHealth();
    expect(response.status).toBe('healthy');
    expect(() => new Date(response.timestamp)).not.toThrow();
  });

  it('returns runtime status', () => {
    const response = controller.getStatus();
    expect(response.status).toBe('running');
    expect(response.uptime).toBeGreaterThanOrEqual(0);
    expect(() => new Date(response.timestamp)).not.toThrow();
  });
});

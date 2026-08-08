describe('logger configuration', () => {
  afterEach(() => {
    jest.resetModules();
    delete process.env.NODE_ENV;
  });

  it('silences logging in test mode to avoid noisy test output', () => {
    process.env.NODE_ENV = 'test';

    const { logger } = require('./logger');

    expect(logger.level).toBe('silent');
  });
});

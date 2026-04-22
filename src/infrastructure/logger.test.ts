import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';

vi.mock('fs');

describe('Logger', () => {
  const mockConfigPath = '/mock/path/config.json';
  const expectedLogPath = path.join('/mock/path', 'valiv_debug.log');
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = new Logger(mockConfigPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info should print to console.log and write to file', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fsSpy = vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {});

    logger.info('test info');

    expect(consoleSpy).toHaveBeenCalledWith('test info');
    expect(fsSpy).toHaveBeenCalledWith(expectedLogPath, expect.stringContaining('[INFO] test info'));
  });

  it('error should print friendly message to console.error and write stack trace to file', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fsSpy = vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {});
    const mockError = new Error('Original Error');
    mockError.stack = 'stack trace content';

    logger.error('Failed to fetch', mockError);

    // Should include friendly message
    expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch 時間を置いて再度お試し下さい。');
    // File should contain original error detail
    expect(fsSpy).toHaveBeenCalledWith(
      expectedLogPath,
      expect.stringContaining('[ERROR] Failed to fetch\nstack trace content'),
    );
  });

  it('debug should only write to file', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fsSpy = vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {});

    logger.debug('debug message', { key: 'value' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(fsSpy).toHaveBeenCalledWith(
      expectedLogPath,
      expect.stringContaining('[DEBUG] debug message\n{\n  "key": "value"\n}'),
    );
  });

  it('should ignore errors when writing to file fails', () => {
    vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {
      throw new Error('Disk full');
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Should not throw
    expect(() => logger.info('test')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith('test');
  });
});

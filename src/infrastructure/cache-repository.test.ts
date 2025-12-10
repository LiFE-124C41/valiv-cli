import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CacheRepository } from './cache-repository.js';
import Conf from 'conf';

// Mock conf
vi.mock('conf', () => {
  const ConfMock = vi.fn();
  ConfMock.prototype.get = vi.fn();
  ConfMock.prototype.set = vi.fn();
  ConfMock.prototype.delete = vi.fn();
  return { default: ConfMock };
});

describe('CacheRepository', () => {
  let repository: CacheRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let confInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new CacheRepository();
    confInstance = (Conf as unknown as Mock).mock.results[0].value;
  });

  describe('get', () => {
    it('should return null if key does not exist', () => {
      confInstance.get.mockReturnValue(undefined);
      const result = repository.get('test-key');
      expect(result).toBeNull();
    });

    it('should return cached data', () => {
      const cachedData = {
        data: { foo: 'bar' },
        timestamp: 1234567890,
      };
      confInstance.get.mockReturnValue(cachedData);

      const result = repository.get('test-key');

      expect(result).toEqual(cachedData);
      expect(confInstance.get).toHaveBeenCalledWith('test-key');
    });
  });

  describe('set', () => {
    it('should save data with timestamp', () => {
      const now = 1000000000;
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const data = { foo: 'bar' };
      repository.set('test-key', data);

      expect(confInstance.set).toHaveBeenCalledWith('test-key', {
        data,
        timestamp: now,
      });

      vi.useRealTimers();
    });
  });

  describe('clear', () => {
    it('should delete key from store', () => {
      repository.clear('test-key');
      expect(confInstance.delete).toHaveBeenCalledWith('test-key');
    });
  });
});

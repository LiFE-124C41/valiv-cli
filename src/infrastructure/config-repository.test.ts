import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { ConfigRepository } from './config-repository.js';
import Conf from 'conf';
import { Creator } from '../domain/models.js';

// Mock conf
vi.mock('conf', () => {
  const ConfMock = vi.fn();
  ConfMock.prototype.get = vi.fn();
  ConfMock.prototype.set = vi.fn();
  ConfMock.prototype.delete = vi.fn();
  return { default: ConfMock };
});

describe('ConfigRepository', () => {
  let repository: ConfigRepository;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let confInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ConfigRepository();
    // Get the mock instance created by the constructor
    confInstance = (Conf as unknown as Mock).mock.results[0].value;
  });

  describe('getCreators', () => {
    it('should return empty array when no creators saved', () => {
      confInstance.get.mockReturnValue([]);
      const creators = repository.getCreators();
      expect(creators).toEqual([]);
      expect(confInstance.get).toHaveBeenCalledWith('creators');
    });

    it('should return saved creators', () => {
      const mockCreators: Creator[] = [{ id: '1', name: 'Test' }];
      confInstance.get.mockReturnValue(mockCreators);
      const creators = repository.getCreators();
      expect(creators).toEqual(mockCreators);
    });
  });

  describe('saveCreator', () => {
    it('should add new creator', () => {
      confInstance.get.mockReturnValue([]);
      const newCreator: Creator = { id: '1', name: 'Test' };

      repository.saveCreator(newCreator);

      expect(confInstance.set).toHaveBeenCalledWith('creators', [newCreator]);
    });

    it('should update existing creator', () => {
      const existingCreator: Creator = { id: '1', name: 'Old Name' };
      confInstance.get.mockReturnValue([existingCreator]);
      const updatedCreator: Creator = { id: '1', name: 'New Name' };

      repository.saveCreator(updatedCreator);

      expect(confInstance.set).toHaveBeenCalledWith('creators', [
        updatedCreator,
      ]);
    });
  });

  describe('saveCreators', () => {
    it('should add multiple new creators', () => {
      confInstance.get.mockReturnValue([]);
      const newCreators: Creator[] = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ];

      repository.saveCreators(newCreators);

      expect(confInstance.set).toHaveBeenCalledWith('creators', newCreators);
    });

    it('should update mixed new and existing creators', () => {
      const existing: Creator = { id: '1', name: 'Old 1' };
      confInstance.get.mockReturnValue([existing]);

      const updates: Creator[] = [
        { id: '1', name: 'New 1' },
        { id: '2', name: 'New 2' },
      ];

      repository.saveCreators(updates);

      expect(confInstance.set).toHaveBeenCalledWith('creators', [
        { id: '1', name: 'New 1' },
        { id: '2', name: 'New 2' },
      ]);
    });
  });

  describe('removeCreator', () => {
    it('should remove existing creator', () => {
      const creators: Creator[] = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ];
      confInstance.get.mockReturnValue(creators);

      repository.removeCreator('1');

      expect(confInstance.set).toHaveBeenCalledWith('creators', [
        { id: '2', name: 'Test 2' },
      ]);
    });

    it('should do nothing if creator not found', () => {
      const creators: Creator[] = [{ id: '1', name: 'Test 1' }];
      confInstance.get.mockReturnValue(creators);

      repository.removeCreator('2');

      expect(confInstance.set).toHaveBeenCalledWith('creators', creators);
    });
  });
});

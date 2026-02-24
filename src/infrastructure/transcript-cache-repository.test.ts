import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranscriptCacheRepository } from './transcript-cache-repository.js';
import * as fs from 'fs';
import * as os from 'os';

vi.mock('fs');
vi.mock('os');

describe('TranscriptCacheRepository', () => {
  let repo: TranscriptCacheRepository;

  beforeEach(() => {
    vi.spyOn(os, 'homedir').mockReturnValue('/mock');
    vi.spyOn(os, 'platform').mockReturnValue('linux'); // test as linux logic

    repo = new TranscriptCacheRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should save up to 50 items and delete oldest', () => {
    let mockIndex: Record<string, string[]> = {};

    // index.json の読み書きをモック
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (filePath.toString().includes('index.json')) {
        return JSON.stringify(mockIndex);
      }
      return '';
    });
    vi.spyOn(fs, 'writeFileSync').mockImplementation((filePath, data) => {
      if (filePath.toString().includes('index.json')) {
        mockIndex = JSON.parse(data.toString());
      }
    });

    const unlinkSpy = vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    // 51件追加する
    for (let i = 1; i <= 51; i++) {
      repo.saveTranscript('creatorA', `video${i}`, []);
    }

    // indexには最新の50件（video2〜video51）が保存されているはず
    expect(mockIndex['creatorA'].length).toBe(50);
    expect(mockIndex['creatorA'][0]).toBe('video51'); // 最新
    expect(mockIndex['creatorA'][49]).toBe('video2'); // 最古

    // 古いファイル（video1.json）が削除されたか確認
    expect(unlinkSpy).toHaveBeenCalled();
  });
});

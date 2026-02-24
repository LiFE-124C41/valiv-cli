import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TranscriptCacheEntry, TranscriptText } from '../domain/models.js';

interface TranscriptIndex {
  [creatorId: string]: string[]; // Array of videoIds, most recent first
}

export class TranscriptCacheRepository {
  private baseDir: string;
  private indexFile: string;
  private dataDir: string;
  private readonly maxEntriesPerCreator = 50;

  constructor() {
    const isWindows = os.platform() === 'win32';
    const configDir = isWindows
      ? process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
      : path.join(os.homedir(), '.config');

    this.baseDir = path.join(configDir, 'valiv', 'transcripts-cache');
    this.indexFile = path.join(this.baseDir, 'index.json');
    this.dataDir = path.join(this.baseDir, 'data');

    this.initDirs();
  }

  private initDirs() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private readIndex(): TranscriptIndex {
    if (!fs.existsSync(this.indexFile)) {
      return {};
    }
    try {
      const data = fs.readFileSync(this.indexFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private writeIndex(index: TranscriptIndex) {
    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }

  private getDataPath(videoId: string): string {
    return path.join(this.dataDir, `${videoId}.json`);
  }

  public getTranscript(videoId: string): TranscriptCacheEntry | null {
    const dataPath = this.getDataPath(videoId);
    if (!fs.existsSync(dataPath)) {
      return null;
    }
    try {
      const data = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(data) as TranscriptCacheEntry;
    } catch {
      return null;
    }
  }

  public saveTranscript(
    creatorId: string,
    videoId: string,
    transcript: TranscriptText[],
    videoTitle?: string,
  ): void {
    const index = this.readIndex();

    // クリエイターの履歴配列を取得・初期化
    if (!index[creatorId]) {
      index[creatorId] = [];
    }
    let history = index[creatorId];

    // すでに存在する場合は一旦削除（最新として先頭に追加し直すため）
    history = history.filter((id) => id !== videoId);

    // 最新のものを先頭に追加
    history.unshift(videoId);

    // 50件を超えた場合の削除処理
    if (history.length > this.maxEntriesPerCreator) {
      const toDelete = history.slice(this.maxEntriesPerCreator);
      history = history.slice(0, this.maxEntriesPerCreator);

      // 古いファイルを削除
      for (const oldId of toDelete) {
        const oldFile = this.getDataPath(oldId);
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
    }

    // インデックスを更新
    index[creatorId] = history;
    this.writeIndex(index);

    // データファイルとして保存
    const entry: TranscriptCacheEntry = {
      videoId,
      creatorId,
      videoTitle,
      transcript,
      cachedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      this.getDataPath(videoId),
      JSON.stringify(entry, null, 2),
      'utf-8',
    );
  }

  public getAllCachedVideoIds(creatorId: string): string[] {
    const index = this.readIndex();
    return index[creatorId] || [];
  }
}

import Conf from 'conf';
import { ICacheRepository } from '../domain/interfaces.js';

interface CacheSchema {
  [key: string]: {
    data: unknown;
    timestamp: number;
  };
}

export class CacheRepository implements ICacheRepository {
  private store: Conf<CacheSchema>;

  constructor() {
    this.store = new Conf<CacheSchema>({
      projectName: 'valiv-cli-cache',
      defaults: {},
    });
  }

  get<T>(key: string): { data: T; timestamp: number } | null {
    const cached = this.store.get(key);
    if (!cached) {
      return null;
    }
    return cached as { data: T; timestamp: number };
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clear(key: string): void {
    this.store.delete(key);
  }

  getPath(): string {
    return this.store.path;
  }
}

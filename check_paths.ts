
import { ConfigRepository } from './src/infrastructure/config-repository.js';
import { CacheRepository } from './src/infrastructure/cache-repository.js';

const config = new ConfigRepository();
const cache = new CacheRepository();

// Confの内部storeにアクセスするためにanyキャストを使用
console.log('Config Path:', (config as any).store.path);
console.log('Cache Path:', (cache as any).store.path);

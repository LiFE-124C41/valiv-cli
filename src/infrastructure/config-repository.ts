import Conf from 'conf';
import { Creator } from '../domain/models.js';
import { IConfigRepository } from '../domain/interfaces.js';
import { DEFAULT_SPREADSHEET_ID } from '../domain/constants.js';

interface ConfigSchema {
  creators: Creator[];
  youtubeApiToken?: string;
  geminiApiKey?: string;
  twitchClientId?: string;
  twitchClientSecret?: string;
  googleSpreadsheetId?: string;
}

export class ConfigRepository implements IConfigRepository {
  private store: Conf<ConfigSchema>;

  constructor() {
    this.store = new Conf<ConfigSchema>({
      projectName: 'valiv-cli',
      defaults: {
        creators: [],
      },
    });
  }

  getCreators(): Creator[] {
    return this.store.get('creators') || [];
  }

  saveCreator(creator: Creator): void {
    const creators = this.getCreators();
    const index = creators.findIndex((c) => c.id === creator.id);

    if (index >= 0) {
      creators[index] = creator;
    } else {
      creators.push(creator);
    }

    this.store.set('creators', creators);
  }

  saveCreators(newCreators: Creator[]): void {
    const creators = this.getCreators();

    for (const creator of newCreators) {
      const index = creators.findIndex((c) => c.id === creator.id);
      if (index >= 0) {
        creators[index] = creator;
      } else {
        creators.push(creator);
      }
    }

    this.store.set('creators', creators);
  }

  removeCreator(id: string): void {
    const creators = this.getCreators();
    const newCreators = creators.filter((c) => c.id !== id);
    this.store.set('creators', newCreators);
  }

  getYoutubeApiToken(): string | undefined {
    return this.store.get('youtubeApiToken');
  }

  saveYoutubeApiToken(token: string): void {
    this.store.set('youtubeApiToken', token);
  }

  getGoogleSpreadsheetId(): string | undefined {
    return this.store.get('googleSpreadsheetId') || DEFAULT_SPREADSHEET_ID;
  }

  saveGoogleSpreadsheetId(id: string): void {
    this.store.set('googleSpreadsheetId', id);
  }

  getGeminiApiKey(): string | undefined {
    return this.store.get('geminiApiKey');
  }

  saveGeminiApiKey(key: string): void {
    this.store.set('geminiApiKey', key);
  }

  getTwitchClientId(): string | undefined {
    return this.store.get('twitchClientId');
  }

  saveTwitchClientId(clientId: string): void {
    this.store.set('twitchClientId', clientId);
  }

  getTwitchClientSecret(): string | undefined {
    return this.store.get('twitchClientSecret');
  }

  saveTwitchClientSecret(clientSecret: string): void {
    this.store.set('twitchClientSecret', clientSecret);
  }

  getPath(): string {
    return this.store.path;
  }
}

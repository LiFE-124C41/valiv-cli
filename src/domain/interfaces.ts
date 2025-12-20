import { Activity, Creator, ScheduleEvent } from './models.js';

export interface ICreatorRepository {
  getAll(): Promise<Creator[]>;
  removeCreator(id: string): void;
}

export interface ICacheRepository {
  get<T>(key: string): { data: T; timestamp: number } | null;
  set<T>(key: string, data: T): void;
  clear(key: string): void;
  getPath(): string;
}

export interface IActivityService {
  getActivities(
    creators: Creator[],
    forceRefresh?: boolean,
    apiKey?: string,
  ): Promise<Activity[]>;
  getChannelInfo(channelId: string): Promise<{ title: string } | null>;
}

export interface IScheduleService {
  getSchedules(
    creators: Creator[],
    forceRefresh?: boolean,
  ): Promise<ScheduleEvent[]>;
}

export interface IConfigRepository {
  getCreators(): Creator[];
  saveCreator(creator: Creator): void;
  saveCreators(creators: Creator[]): void;
  removeCreator(id: string): void;
  getYoutubeApiToken(): string | undefined;
  saveYoutubeApiToken(token: string): void;
  getPath(): string;
}

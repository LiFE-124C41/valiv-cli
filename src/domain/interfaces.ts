import { Activity, Creator, ScheduleEvent } from './models.js';

export interface ICreatorRepository {
  getAll(): Promise<Creator[]>;
  get(id: string): Promise<Creator | undefined>;
  add(creator: Creator): Promise<void>;
  update(creator: Creator): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IActivityService {
  getActivities(creators: Creator[]): Promise<Activity[]>;
}

export interface IScheduleService {
  getSchedules(creators: Creator[]): Promise<ScheduleEvent[]>;
}

export interface IConfigRepository {
  getCreators(): Creator[];
  saveCreator(creator: Creator): void;
  saveCreators(creators: Creator[]): void;
  removeCreator(id: string): void;
}

import ical from 'node-ical';
import { Creator, ScheduleEvent } from '../domain/models.js';
import { ICacheRepository, IScheduleService } from '../domain/interfaces.js';

export class CalendarService implements IScheduleService {
  constructor(private cacheRepo: ICacheRepository) { }

  async getSchedules(
    creators: Creator[],
    forceRefresh = false,
  ): Promise<ScheduleEvent[]> {
    const cacheKey = 'calendar_schedules';
    const cached = this.cacheRepo.get<ScheduleEvent[]>(cacheKey);
    const now = new Date();

    if (!forceRefresh && cached) {
      const cacheDate = new Date(cached.timestamp);
      if (
        cacheDate.getDate() === now.getDate() &&
        cacheDate.getMonth() === now.getMonth() &&
        cacheDate.getFullYear() === now.getFullYear()
      ) {
        // Restore Date objects
        return cached.data
          .map((e) => ({
            ...e,
            startTime: new Date(e.startTime),
            endTime: e.endTime ? new Date(e.endTime) : undefined,
          }))
          .filter((event) => event.startTime >= now); // Re-filter for current time
      }
    }

    const promises = creators
      .filter((c) => c.calendarUrl)
      .map(async (creator) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const events = await ical.async.fromURL(creator.calendarUrl!);
          const now = new Date();

          return (
            Object.values(events)
              .filter((event) => event.type === 'VEVENT')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((event: any) => ({
                id: event.uid,
                title: event.summary,
                startTime: new Date(event.start),
                endTime: event.end ? new Date(event.end) : undefined,
                url: event.url,
                description: event.description,
                platform: 'calendar' as const,
                author: creator,
              }))
              .filter((event) => event.startTime >= now)
          ); // Future events only
        } catch (error) {
          console.error(`Failed to fetch Calendar for ${creator.name}:`, error);
          return [];
        }
      });

    const results = await Promise.all(promises);
    const schedules = results
      .flat()
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    this.cacheRepo.set(cacheKey, schedules);
    return schedules;
  }
}

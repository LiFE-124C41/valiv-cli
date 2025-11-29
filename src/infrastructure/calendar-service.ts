import ical from 'node-ical';
import { Creator, ScheduleEvent } from '../domain/models.js';
import { IScheduleService } from '../domain/interfaces.js';

export class CalendarService implements IScheduleService {
  async getSchedules(creators: Creator[]): Promise<ScheduleEvent[]> {
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
              }))
              .filter((event) => event.startTime >= now)
          ); // Future events only
        } catch (error) {
          console.error(`Failed to fetch Calendar for ${creator.name}:`, error);
          return [];
        }
      });

    const results = await Promise.all(promises);
    return results
      .flat()
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
}

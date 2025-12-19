import ical from 'node-ical';
import { Creator, ScheduleEvent } from '../domain/models.js';
import {
  ICacheRepository,
  IConfigRepository,
  IScheduleService,
} from '../domain/interfaces.js';
import { YouTubeService } from './youtube-service.js';

export class CalendarService implements IScheduleService {
  constructor(
    private cacheRepo: ICacheRepository,
    private configRepo: IConfigRepository,
    private youtubeService: YouTubeService,
  ) { }

  async getSchedules(
    creators: Creator[],
    forceRefresh = false,
  ): Promise<ScheduleEvent[]> {
    const apiKey = this.configRepo.getYoutubeApiToken();
    const useApi = !!apiKey;
    const cacheKey = useApi ? 'calendar_schedules_api' : 'calendar_schedules';

    // Cache logic
    const cached = this.cacheRepo.get<ScheduleEvent[]>(cacheKey);
    const now = new Date();

    if (!forceRefresh && cached) {
      const cacheDate = new Date(cached.timestamp);
      if (
        cacheDate.getDate() === now.getDate() &&
        cacheDate.getMonth() === now.getMonth() &&
        cacheDate.getFullYear() === now.getFullYear()
      ) {
        return cached.data
          .map((e) => ({
            ...e,
            startTime: new Date(e.startTime),
            endTime: e.endTime ? new Date(e.endTime) : undefined,
          }))
          .filter((event) => {
            if (event.endTime) {
              return event.endTime > now;
            }
            return event.startTime >= now;
          });
      }
    }

    let schedules: ScheduleEvent[] = [];
    let youtubeEvents: ScheduleEvent[] = [];

    // 1. Fetch from YouTube API if available
    if (useApi) {
      youtubeEvents = await this.youtubeService.getUpcomingStreams(
        creators,
        apiKey,
      );
      // Filter for 1 month range (client-side limit as requested)
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      youtubeEvents = youtubeEvents.filter((e) => e.startTime <= oneMonthLater);

      // Also get live streams
      const liveEvents = await this.youtubeService.getLiveStreams(
        creators,
        apiKey,
      );
      youtubeEvents = [...liveEvents, ...youtubeEvents];
    }

    // 2. Fetch from iCal (Always fetch all future events first, then dedup)
    const iCalPromises = creators
      .filter((c) => c.calendarUrl)
      .map(async (creator) => {
        try {
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
                url: event.url || '',
                description: event.description || '',
                platform: 'calendar' as const,
                author: creator,
              }))
              .filter((event) => {
                // Time filter
                const endTime = event.endTime
                  ? new Date(event.endTime)
                  : undefined;
                const isFuture = endTime
                  ? endTime > now
                  : event.startTime >= now;

                return isFuture;
              })
          );
        } catch (error) {
          console.error(`Failed to fetch Calendar for ${creator.name}:`, error);
          return [];
        }
      });

    const iCalResults = await Promise.all(iCalPromises);
    const iCalEvents = iCalResults.flat();

    // 3. Merge and Deduplicate
    // Start with all YouTube events
    schedules = [...youtubeEvents];

    if (useApi) {
      // If using API, check each iCal event.
      // If it overlaps with a YouTube event, discard it (YouTube takes precedence).
      // Overlap condition: iCal.start <= YouTube.start <= iCal.end
      for (const event of iCalEvents) {
        const matchingYtEvent = youtubeEvents.find((ytEvent) => {
          // We need to compare strict times.
          // Note: iCal events usually have endTime. If not, we might assume 1 hour duration or just check start time match.
          // User request: "ical start <= yt start <= ical end" (inclusive/between)

          // Must be the same creator to be considered a duplicate
          if (event.author?.id !== ytEvent.author?.id) {
            return false;
          }

          if (!event.endTime) {
            // Fallback: if no end time, maybe check if start times are very close?
            // or just keep it.
            return false;
          }
          return (
            event.startTime.getTime() <= ytEvent.startTime.getTime() &&
            ytEvent.startTime.getTime() <= event.endTime.getTime()
          );
        });

        if (matchingYtEvent) {
          // Update endTime from iCal if available (overwrite API data as requested)
          if (event.endTime) {
            matchingYtEvent.endTime = event.endTime;
          }
        } else {
          schedules.push(event);
        }
      }
    } else {
      // If not using API, just use all iCal events
      schedules = iCalEvents;
    }

    schedules.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    this.cacheRepo.set(cacheKey, schedules);
    return schedules;
  }
}

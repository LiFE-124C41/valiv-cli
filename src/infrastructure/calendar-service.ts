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
  ) {}

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
            // Consistent filtering logic with fresh fetch
            if (event.status === 'live') return true;

            if (event.endTime) {
              return event.endTime > now;
            }
            // Allow events that started recently (within last 3 hours) even if "past"
            // This handles late starts or short streams where API hasn't updated status yet
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            return event.startTime >= threeHoursAgo;
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
                // Relaxed Time filter for merging purposes
                // We need past events to merge endTime into YouTube events
                // Keep events from the last 24 hours so we can correctly filter finished streams
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

                const endTime = event.endTime
                  ? new Date(event.endTime)
                  : undefined;

                if (endTime) {
                  return endTime > oneDayAgo;
                }
                return event.startTime > oneDayAgo;
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

    // Final filter to ensure no past events are returned
    // (Especially important after merging end times from iCal)
    schedules = schedules.filter((event) => {
      // Always show live events
      if (event.status === 'live') return true;

      // If we have an end time, strictly check if it's in the future
      if (event.endTime) {
        return event.endTime > now;
      }

      // If no end time (e.g. pure YouTube event without iCal match),
      // we usually keep it as it might be a late start.
      // However, if it started more than 3 hours ago, it's likely a flawed "upcoming" or finished stream.
      // (User reported case: 4 hours past start still showing. 3 hours should fix it while allowing late starts)
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      return event.startTime >= threeHoursAgo;
    });

    schedules.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    this.cacheRepo.set(cacheKey, schedules);
    return schedules;
  }
}

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CalendarService } from './calendar-service.js';
import ical from 'node-ical';
import { Creator, ScheduleEvent } from '../domain/models.js';
import { YouTubeService } from './youtube-service.js';
import { ICacheRepository, IConfigRepository } from '../domain/interfaces.js';

// Mock node-ical
vi.mock('node-ical', () => {
  return {
    default: {
      async: {
        fromURL: vi.fn(),
      },
    },
  };
});

describe('CalendarService', () => {
  let service: CalendarService;
  let cacheRepoMock: { get: Mock; set: Mock; clear: Mock };
  let configRepoMock: {
    getYoutubeApiToken: Mock;
    getCreators: Mock;
    setCreators: Mock;
  };
  let youtubeServiceMock: { getUpcomingStreams: Mock; getLiveStreams: Mock };

  beforeEach(() => {
    vi.clearAllMocks();
    cacheRepoMock = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      clear: vi.fn(),
    };
    configRepoMock = {
      getYoutubeApiToken: vi.fn().mockReturnValue(null),
      getCreators: vi.fn(),
      setCreators: vi.fn(),
    };
    youtubeServiceMock = {
      getUpcomingStreams: vi.fn().mockResolvedValue([]),
      getLiveStreams: vi.fn().mockResolvedValue([]),
    };
    service = new CalendarService(
      cacheRepoMock as unknown as ICacheRepository,
      configRepoMock as unknown as IConfigRepository,
      youtubeServiceMock as unknown as YouTubeService,
    );
  });

  describe('getSchedules', () => {
    const creator: Creator = {
      id: '1',
      name: 'Test Creator',
      calendarUrl: 'http://example.com/calendar.ics',
    };

    it('should fetch and filter future events correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockEvents = {
        '1': {
          type: 'VEVENT',
          uid: '1',
          summary: 'Future Event',
          start: futureDate,
          end: new Date(futureDate.getTime() + 3600000),
          url: 'http://example.com/event1',
          description: 'Description 1',
        },
        '2': {
          type: 'VEVENT',
          uid: '2',
          summary: 'Past Event',
          start: pastDate,
          end: new Date(pastDate.getTime() + 3600000),
          url: 'http://example.com/event2',
          description: 'Description 2',
        },
        '3': {
          type: 'VEVENT',
          uid: '3',
          summary: 'Ongoing Event',
          start: new Date(new Date().getTime() - 1800000), // Started 30 mins ago
          end: new Date(new Date().getTime() + 1800000), // Ends in 30 mins
          url: 'http://example.com/event3',
          description: 'Description 3',
        },
      };

      (ical.async.fromURL as unknown as Mock).mockResolvedValue(mockEvents);

      const schedules = await service.getSchedules([creator]);

      expect(ical.async.fromURL).toHaveBeenCalledWith(
        'http://example.com/calendar.ics',
      );
      expect(schedules).toHaveLength(2);
      expect(schedules[0]).toEqual(
        expect.objectContaining({
          id: '3',
          title: 'Ongoing Event',
        }),
      );

      expect(schedules[1]).toEqual(
        expect.objectContaining({
          id: '1',
          title: 'Future Event',
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      (ical.async.fromURL as unknown as Mock).mockRejectedValue(
        new Error('Network Error'),
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const schedules = await service.getSchedules([creator]);

      expect(schedules).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should ignore creators without calendarUrl', async () => {
      const creatorNoUrl: Creator = {
        id: '2',
        name: 'No URL Creator',
      };

      const schedules = await service.getSchedules([creatorNoUrl]);

      expect(ical.async.fromURL).not.toHaveBeenCalled();
      expect(schedules).toHaveLength(0);
    });

    it('should dedup events if they overlap with YouTube streams from the SAME creator and update end time', async () => {
      configRepoMock.getYoutubeApiToken.mockReturnValue('fake-token');

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(20, 0, 0, 0); // 20:00

      // iCal event: 20:00 - 22:30
      // Expected End Time: 22:30
      const expectedEndTime = new Date(futureDate.getTime() + 2.5 * 3600000);

      const mockEvents = {
        '1': {
          type: 'VEVENT',
          uid: 'ical-1',
          summary: 'Stream Placeholder',
          start: futureDate,
          end: expectedEndTime,
          url: '',
          description: '',
        },
      };

      (ical.async.fromURL as unknown as Mock).mockResolvedValue(mockEvents);

      const ytStartTime = new Date(futureDate);
      ytStartTime.setHours(22, 0, 0, 0); // 22:00

      const ytEvent: ScheduleEvent = {
        id: 'yt-1',
        title: 'Actual Stream',
        startTime: ytStartTime,
        endTime: undefined, // YouTube API might not return end time yet
        platform: 'youtube',
        author: creator, // SAME CREATOR
      };

      youtubeServiceMock.getUpcomingStreams.mockResolvedValue([ytEvent]);

      const schedules = await service.getSchedules([creator]);

      // iCal event should be removed because it overlaps and is from same creator
      expect(schedules).toHaveLength(1);
      expect(schedules[0].id).toBe('yt-1');
      expect(schedules[0].platform).toBe('youtube');

      // End time should be updated from iCal
      expect(schedules[0].endTime).toEqual(expectedEndTime);
    });

    it('should NOT dedup events if they overlap with YouTube streams from DIFFERENT creators', async () => {
      configRepoMock.getYoutubeApiToken.mockReturnValue('fake-token');

      const creator2: Creator = {
        id: '2',
        name: 'Another Creator',
        calendarUrl: 'http://example.com/cal2.ics',
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(20, 0, 0, 0); // 20:00

      // Creator 1 (Twitch/iCal): 20:00 - 22:30
      const mockEvents1 = {
        '1': {
          type: 'VEVENT',
          uid: 'ical-1',
          summary: 'Twitch Stream',
          start: futureDate,
          end: new Date(futureDate.getTime() + 2.5 * 3600000), // 22:30
          url: '',
          description: '',
        },
      };

      // Creator 2: No iCal events
      (ical.async.fromURL as unknown as Mock).mockImplementation((url) => {
        if (url === creator.calendarUrl) return Promise.resolve(mockEvents1);
        return Promise.resolve({});
      });

      const ytStartTime = new Date(futureDate);
      ytStartTime.setHours(22, 0, 0, 0); // 22:00

      // Creator 2 (YouTube): 22:00 - 0:00
      const ytEvent: ScheduleEvent = {
        id: 'yt-1',
        title: 'YouTube Stream',
        startTime: ytStartTime,
        endTime: new Date(ytStartTime.getTime() + 2 * 3600000),
        platform: 'youtube',
        author: creator2, // DIFFERENT CREATOR
      };

      youtubeServiceMock.getUpcomingStreams.mockResolvedValue([ytEvent]);

      const schedules = await service.getSchedules([creator, creator2]);

      // Both events should exist
      expect(schedules).toHaveLength(2);
      const platforms = schedules.map((s) => s.platform).sort();
      expect(platforms).toEqual(['calendar', 'youtube']);
    });

    it('should include live streams from YouTube', async () => {
      configRepoMock.getYoutubeApiToken.mockReturnValue('fake-token');

      const liveEvent: ScheduleEvent = {
        id: 'live-1',
        title: 'Live Stream',
        startTime: new Date(),
        platform: 'youtube',
        status: 'live',
        author: creator,
      };

      youtubeServiceMock.getLiveStreams.mockResolvedValue([liveEvent]);

      const schedules = await service.getSchedules([creator]);

      expect(youtubeServiceMock.getLiveStreams).toHaveBeenCalledWith(
        [creator],
        'fake-token',
      );
      expect(schedules).toContainEqual(
        expect.objectContaining({ id: 'live-1', status: 'live' }),
      );
    });
  });
});

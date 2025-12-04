import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { CalendarService } from './calendar-service.js';
import ical from 'node-ical';
import { Creator } from '../domain/models.js';

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

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CalendarService();
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
      };

      (ical.async.fromURL as unknown as Mock).mockResolvedValue(mockEvents);

      const schedules = await service.getSchedules([creator]);

      expect(ical.async.fromURL).toHaveBeenCalledWith(
        'http://example.com/calendar.ics',
      );
      expect(schedules).toHaveLength(1);
      expect(schedules[0]).toEqual({
        id: '1',
        title: 'Future Event',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 3600000),
        url: 'http://example.com/event1',
        description: 'Description 1',
        platform: 'calendar',
        author: creator,
      });
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
  });
});

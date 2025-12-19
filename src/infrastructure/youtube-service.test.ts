import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { YouTubeService } from './youtube-service.js';
import Parser from 'rss-parser';
import { Creator } from '../domain/models.js';

// Mock rss-parser
vi.mock('rss-parser', () => {
  return {
    default: vi.fn(),
  };
});

describe('YouTubeService', () => {
  let service: YouTubeService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockParserInstance: any;
  let cacheRepoMock: { get: Mock; set: Mock; clear: Mock };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup the mock instance
    mockParserInstance = {
      parseURL: vi.fn(),
    };

    // When new Parser() is called, return our mock instance
    (Parser as unknown as Mock).mockImplementation(function () {
      return mockParserInstance;
    });

    cacheRepoMock = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      clear: vi.fn(),
    };
    service = new YouTubeService(cacheRepoMock);
  });

  describe('getActivities', () => {
    const creator: Creator = {
      id: '1',
      name: 'Test Creator',
      youtubeChannelId: 'channel-id',
    };

    it('should fetch and parse activities correctly', async () => {
      const mockFeed = {
        items: [
          {
            id: 'video1',
            title: 'Video 1',
            link: 'http://youtube.com/video1',
            pubDate: '2023-01-01T10:00:00Z',
            media: {
              'media:community': [
                {
                  'media:statistics': [{ $: { views: '1000' } }],
                },
              ],
            },
          },
        ],
      };

      mockParserInstance.parseURL.mockResolvedValue(mockFeed);

      const activities = await service.getActivities([creator]);

      expect(mockParserInstance.parseURL).toHaveBeenCalledWith(
        'https://www.youtube.com/feeds/videos.xml?channel_id=channel-id',
      );
      expect(activities).toHaveLength(1);
      expect(activities[0]).toEqual({
        id: 'video1',
        title: 'Video 1',
        url: 'http://youtube.com/video1',
        platform: 'youtube',
        type: 'video',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        author: creator,
        views: 1000,
        status: 'video',
      });
    });

    it('should handle errors gracefully', async () => {
      mockParserInstance.parseURL.mockRejectedValue(new Error('Network error'));

      // Console error mock to keep output clean
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const activities = await service.getActivities([creator]);

      expect(activities).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should ignore creators without youtubeChannelId', async () => {
      const creatorNoId: Creator = {
        id: '2',
        name: 'No ID Creator',
      };

      const activities = await service.getActivities([creatorNoId]);

      expect(mockParserInstance.parseURL).not.toHaveBeenCalled();
      expect(activities).toHaveLength(0);
    });
  });

  describe('getChannelInfo', () => {
    it('should return channel info correctly', async () => {
      mockParserInstance.parseURL.mockResolvedValue({
        title: 'Channel Title',
      });

      const info = await service.getChannelInfo('channel-id');

      expect(info).toEqual({ title: 'Channel Title' });
    });

    it('should return null on error', async () => {
      mockParserInstance.parseURL.mockRejectedValue(new Error('Error'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const info = await service.getChannelInfo('channel-id');

      expect(info).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

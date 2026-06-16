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

import { ILogger } from '../domain/interfaces.js';

describe('YouTubeService', () => {
  let service: YouTubeService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockParserInstance: any;
  let cacheRepoMock: { get: Mock; set: Mock; clear: Mock; getPath: Mock };
  let loggerMock: {
    info: Mock;
    warn: Mock;
    error: Mock;
    debug: Mock;
    getLogPath: Mock;
  };

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
      getPath: vi.fn().mockReturnValue('fake-path'),
    };
    loggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      getLogPath: vi.fn().mockReturnValue('valiv_debug.log'),
    };
    service = new YouTubeService(
      cacheRepoMock,
      loggerMock as unknown as ILogger,
    );
  });

  it('should initialize Parser with User-Agent header', () => {
    expect(Parser).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('Mozilla/5.0'),
        }),
      }),
    );
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
        isShorts: false,
      });
    });

    it('should detect shorts from title hashtag', async () => {
      const mockFeed = {
        items: [
          {
            id: 'video1',
            title: 'Cool Video #shorts',
            link: 'http://youtube.com/video1',
            pubDate: '2023-01-01T10:00:00Z',
          },
        ],
      };

      mockParserInstance.parseURL.mockResolvedValue(mockFeed);

      const activities = await service.getActivities([creator]);
      expect(activities[0].isShorts).toBe(true);
    });

    it('should detect shorts from description hashtag', async () => {
      const mockFeed = {
        items: [
          {
            id: 'video1',
            title: 'Cool Video',
            link: 'http://youtube.com/video1',
            pubDate: '2023-01-01T10:00:00Z',
            media: {
              'media:description': [
                'This is a description containing #Shorts for this video.',
              ],
            },
          },
        ],
      };

      mockParserInstance.parseURL.mockResolvedValue(mockFeed);

      const activities = await service.getActivities([creator]);
      expect(activities[0].isShorts).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockParserInstance.parseURL.mockRejectedValue(new Error('Network error'));

      const activities = await service.getActivities([creator]);

      expect(activities).toHaveLength(0);
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch YouTube feed'),
        expect.any(Error),
      );
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

      const info = await service.getChannelInfo('channel-id');

      expect(info).toBeNull();
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch channel info'),
        expect.any(Error),
      );
    });
  });
});

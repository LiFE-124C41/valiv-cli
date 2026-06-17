import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import axios from 'axios';
import { SpreadsheetService } from './spreadsheet-service.js';

import { Creator } from '../domain/models.js';
import { ICacheRepository, ILogger } from '../domain/interfaces.js';

vi.mock('axios');

describe('SpreadsheetService', () => {
  let service: SpreadsheetService;
  let mockCacheRepo: { get: Mock; set: Mock; clear: Mock; getPath: Mock };
  let mockLogger: {
    info: Mock;
    warn: Mock;
    error: Mock;
    debug: Mock;
    getLogPath: Mock;
  };
  const mockSpreadsheetId = 'test-sheet-id';

  const mockCreators: Creator[] = [
    {
      id: 'creator1',
      name: 'Creator 1',
      youtubeChannelId: 'yt1',
    },
  ];

  beforeEach(() => {
    mockCacheRepo = {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      getPath: vi.fn(),
    };
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      getLogPath: vi.fn().mockReturnValue('valiv_debug.log'),
    };
    service = new SpreadsheetService(
      mockCacheRepo as unknown as ICacheRepository,
      mockLogger as unknown as ILogger,
    );
    vi.resetAllMocks();
  });

  const createCsvData = (rows: string[][]) => {
    return rows
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  };

  it('should fetch and parse statistics correctly', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];

    // Headers + Yesterday + Today for YouTube
    const youtubeCsv = createCsvData([
      ['Date', 'Member ID', 'Name', 'Subscribers', 'Video Count', 'View Count'],
      [yesterday, 'creator1', 'Creator 1', '1,000', '10', '10,000'],
      [today, 'creator1', 'Creator 1', '1,050', '12', '10,500'],
    ]);

    // Headers + Yesterday + Today for X
    const xCsv = createCsvData([
      ['Date', 'Member ID', 'Name', 'Followers', 'Tweets', 'Listed', 'Following'],
      [yesterday, 'creator1', 'Creator 1', '5,000', '1,000', '100', '200'],
      [today, 'creator1', 'Creator 1', '5,100', '1,010', '105', '205'],
    ]);

    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes('sheet=daily_stats')) {
        return { data: youtubeCsv };
      }
      if (url.includes('sheet=x_stats')) {
        return { data: xCsv };
      }
      return { data: '' };
    });

    const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

    expect(stats['creator1']).toBeDefined();
    expect(stats['creator1'].subscriberCount).toBe('1,050');
    expect(stats['creator1'].videoCount).toBe('12');
    expect(stats['creator1'].viewCount).toBe('10,500');

    // Growth: 1050 - 1000 = 50
    expect(stats['creator1'].subscriberGrowth).toBe(50);
    // Growth: 12 - 10 = 2
    expect(stats['creator1'].videoGrowth).toBe(2);
    // Growth: 10500 - 10000 = 500
    expect(stats['creator1'].viewGrowth).toBe(500);

    // X stats
    expect(stats['creator1'].xFollowersCount).toBe('5,100');
    expect(stats['creator1'].xTweetCount).toBe('1,010');
    expect(stats['creator1'].xListedCount).toBe('105');
    expect(stats['creator1'].xFollowingCount).toBe('205');
    // X Growth: 5100 - 5000 = 100
    expect(stats['creator1'].xFollowersGrowth).toBe(100);
    // X Tweets Growth: 1010 - 1000 = 10
    expect(stats['creator1'].xTweetsGrowth).toBe(10);
    // X Listed Growth: 105 - 100 = 5
    expect(stats['creator1'].xListedGrowth).toBe(5);
  });

  it('should handle CSV with quoted values containing commas', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];

    const youtubeCsv =
      '"Date","Member ID","Name","Subscribers","Video Count","View Count"\n' +
      `"${yesterday}","creator1","Creator 1","1000","10","10000"\n` +
      `"${today}","creator1","Creator 1","1050","12","10500"`;

    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes('sheet=daily_stats')) {
        return { data: youtubeCsv };
      }
      return { data: '' };
    });

    const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

    // 1050 - 1000
    expect(stats['creator1'].subscriberGrowth).toBe(50);
  });

  it('should use fallback row if yesterday data is missing', async () => {
    const today = new Date().toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2)
      .toISOString()
      .split('T')[0];

    const youtubeCsv = createCsvData([
      ['Date', 'Member ID', 'Name', 'Subscribers', 'Video Count', 'View Count'],
      [twoDaysAgo, 'creator1', 'Creator 1', '1,000', '10', '10,000'],
      [today, 'creator1', 'Creator 1', '1,100', '15', '11,000'],
    ]);

    const xCsv = createCsvData([
      ['Date', 'Member ID', 'Name', 'Followers', 'Tweets', 'Listed', 'Following'],
      [twoDaysAgo, 'creator1', 'Creator 1', '5,000', '1,000', '100', '200'],
      [today, 'creator1', 'Creator 1', '5,200', '1,020', '110', '200'],
    ]);

    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes('sheet=daily_stats')) {
        return { data: youtubeCsv };
      }
      if (url.includes('sheet=x_stats')) {
        return { data: xCsv };
      }
      return { data: '' };
    });

    const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

    expect(stats['creator1'].subscriberGrowth).toBe(100);
    expect(stats['creator1'].xFollowersGrowth).toBe(200);
  });

  it('should return cached data if available and not refreshing', async () => {
    const cachedData = {
      creator1: {
        subscriberCount: '5,000',
        videoCount: '50',
        viewCount: '50,000',
        subscriberGrowth: 10,
        videoGrowth: 1,
        viewGrowth: 100,
        xFollowersCount: '10,000',
        xTweetCount: '2,000',
        xListedCount: '150',
        xFollowingCount: '300',
        xFollowersGrowth: 50,
        xTweetsGrowth: 5,
        xListedGrowth: 2,
      },
    };

    mockCacheRepo.get.mockReturnValue({ data: cachedData });

    const stats = await service.getStatistics(
      mockSpreadsheetId,
      mockCreators,
      false,
    );

    expect(stats).toEqual(cachedData);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should ignore cache if refreshing', async () => {
    const cachedData = { some: 'data' };
    mockCacheRepo.get.mockReturnValue({ data: cachedData });

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];

    const youtubeCsv = createCsvData([
      ['Date', 'Member ID', 'Name', 'Subscribers', 'Video Count', 'View Count'],
      [yesterday, 'creator1', 'Creator 1', '100', '1', '1000'],
      [today, 'creator1', 'Creator 1', '200', '2', '2000'],
    ]);
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes('sheet=daily_stats')) {
        return { data: youtubeCsv };
      }
      return { data: '' };
    });

    await service.getStatistics(mockSpreadsheetId, mockCreators, true);

    expect(axios.get).toHaveBeenCalled();
  });

  it('should gracefully handle network errors for both sheets', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('Network Error'));

    const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

    expect(stats).toEqual({});
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching daily_stats sheet'),
      expect.any(Error),
    );
  });

  it('should partially succeed if one sheet fails to fetch', async () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];

    const youtubeCsv = createCsvData([
      ['Date', 'Member ID', 'Name', 'Subscribers', 'Video Count', 'View Count'],
      [yesterday, 'creator1', 'Creator 1', '1,000', '10', '10,000'],
      [today, 'creator1', 'Creator 1', '1,050', '12', '10,500'],
    ]);

    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes('sheet=daily_stats')) {
        return { data: youtubeCsv };
      }
      if (url.includes('sheet=x_stats')) {
        throw new Error('404 Not Found');
      }
      return { data: '' };
    });

    const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

    expect(stats['creator1']).toBeDefined();
    expect(stats['creator1'].subscriberCount).toBe('1,050');
    expect(stats['creator1'].xFollowersCount).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching x_stats sheet'),
      expect.any(Error),
    );
  });

  it('should handle malformed CSV data', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: 'invalid keys' });
    const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);
    expect(stats).toEqual({});
  });
});

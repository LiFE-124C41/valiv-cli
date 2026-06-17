import axios from 'axios';
import { Creator, CreatorStatistics } from '../domain/models.js';
import { ICacheRepository, ILogger } from '../domain/interfaces.js';

export class SpreadsheetService {
  constructor(
    private cacheRepo: ICacheRepository,
    private logger: ILogger,
  ) {}

  async getStatistics(
    spreadsheetId: string,
    creators: Creator[],
    refresh: boolean = false,
  ): Promise<Record<string, CreatorStatistics>> {
    const results: Record<string, CreatorStatistics> = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // YYYY-MM-DD format
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const yesterdayStr = formatDate(yesterday);
    const todayStr = formatDate(today);
    const cacheKey = `spreadsheet_stats_${todayStr}`;

    // Check cache
    if (!refresh) {
      const cached =
        this.cacheRepo.get<Record<string, CreatorStatistics>>(cacheKey);
      if (cached) {
        return cached.data;
      }
    }

    try {
      // Fetch daily_stats (YouTube)
      let youtubeCsvData = '';
      try {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('daily_stats')}`;
        const response = await axios.get(url);
        youtubeCsvData = response.data as string;
      } catch (e) {
        this.logger.error('Error fetching daily_stats sheet.', e);
      }

      // Fetch x_stats (X)
      let xCsvData = '';
      try {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('x_stats')}`;
        const response = await axios.get(url);
        xCsvData = response.data as string;
      } catch (e) {
        this.logger.warn('Error fetching x_stats sheet.', e);
      }

      if (!youtubeCsvData && !xCsvData) return {};

      // Parse CSV lines
      const parseLine = (line: string) => {
        const parts = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            parts.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current);
        return parts.map((p) => p.replace(/^"|"$/g, ''));
      };

      const youtubeLines = youtubeCsvData
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const xLines = xCsvData
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const youtubeDataByMember: Record<string, string[][]> = {};
      if (youtubeLines.length >= 2) {
        for (let i = 1; i < youtubeLines.length; i++) {
          const row = parseLine(youtubeLines[i]);
          if (row.length < 6) continue;
          const memberId = row[1];
          if (!youtubeDataByMember[memberId]) {
            youtubeDataByMember[memberId] = [];
          }
          youtubeDataByMember[memberId].push(row);
        }
      }

      const xDataByMember: Record<string, string[][]> = {};
      if (xLines.length >= 2) {
        for (let i = 1; i < xLines.length; i++) {
          const row = parseLine(xLines[i]);
          if (row.length < 7) continue;
          const memberId = row[1];
          if (!xDataByMember[memberId]) {
            xDataByMember[memberId] = [];
          }
          xDataByMember[memberId].push(row);
        }
      }

      // Process each creator
      for (const creator of creators) {
        const youtubeRows = youtubeDataByMember[creator.id];
        const xRows = xDataByMember[creator.id];

        if ((!youtubeRows || youtubeRows.length === 0) && (!xRows || xRows.length === 0)) {
          continue;
        }

        const stats: Partial<CreatorStatistics> = {};

        // 1. Process YouTube stats
        if (youtubeRows && youtubeRows.length > 0) {
          const latestRow = youtubeRows[youtubeRows.length - 1];
          const subscriberCountStr = latestRow[3];
          const videoCountStr = latestRow[4];
          const viewCountStr = latestRow[5];

          let yesterdaysSubscriberCount = 0;
          let yesterdaysVideoCount = 0;
          let yesterdaysViewCount = 0;
          let foundYesterday = false;

          for (let i = youtubeRows.length - 2; i >= 0; i--) {
            const row = youtubeRows[i];
            if (row[0] === yesterdayStr) {
              yesterdaysSubscriberCount = parseInt(row[3].replace(/,/g, ''), 10);
              yesterdaysVideoCount = parseInt(row[4].replace(/,/g, ''), 10);
              yesterdaysViewCount = parseInt(row[5].replace(/,/g, ''), 10);
              foundYesterday = true;
              break;
            }
          }

          if (!foundYesterday && youtubeRows.length >= 2) {
            const prevRow = youtubeRows[youtubeRows.length - 2];
            yesterdaysSubscriberCount = parseInt(prevRow[3].replace(/,/g, ''), 10);
            yesterdaysVideoCount = parseInt(prevRow[4].replace(/,/g, ''), 10);
            yesterdaysViewCount = parseInt(prevRow[5].replace(/,/g, ''), 10);
          }

          const currentSubscribers = parseInt(subscriberCountStr.replace(/,/g, ''), 10);
          const subGrowth = currentSubscribers - yesterdaysSubscriberCount;

          const currentVideos = parseInt(videoCountStr.replace(/,/g, ''), 10);
          const videoGrowth = currentVideos - yesterdaysVideoCount;

          const currentViews = parseInt(viewCountStr.replace(/,/g, ''), 10);
          const viewGrowth = currentViews - yesterdaysViewCount;

          stats.subscriberCount = subscriberCountStr;
          stats.videoCount = videoCountStr;
          stats.viewCount = viewCountStr;
          stats.subscriberGrowth = subGrowth;
          stats.videoGrowth = videoGrowth;
          stats.viewGrowth = viewGrowth;
        } else {
          stats.subscriberCount = '';
          stats.videoCount = '';
          stats.viewCount = '';
        }

        // 2. Process X stats
        if (xRows && xRows.length > 0) {
          const latestRow = xRows[xRows.length - 1];
          const followersCountStr = latestRow[3];
          const tweetCountStr = latestRow[4];
          const listedCountStr = latestRow[5];
          const followingCountStr = latestRow[6];

          let yesterdaysFollowersCount = 0;
          let yesterdaysTweetCount = 0;
          let yesterdaysListedCount = 0;
          let foundYesterday = false;

          for (let i = xRows.length - 2; i >= 0; i--) {
            const row = xRows[i];
            if (row[0] === yesterdayStr) {
              yesterdaysFollowersCount = parseInt(row[3].replace(/,/g, ''), 10);
              yesterdaysTweetCount = parseInt(row[4].replace(/,/g, ''), 10);
              yesterdaysListedCount = parseInt(row[5].replace(/,/g, ''), 10);
              foundYesterday = true;
              break;
            }
          }

          if (!foundYesterday && xRows.length >= 2) {
            const prevRow = xRows[xRows.length - 2];
            yesterdaysFollowersCount = parseInt(prevRow[3].replace(/,/g, ''), 10);
            yesterdaysTweetCount = parseInt(prevRow[4].replace(/,/g, ''), 10);
            yesterdaysListedCount = parseInt(prevRow[5].replace(/,/g, ''), 10);
          }

          const currentFollowers = parseInt(followersCountStr.replace(/,/g, ''), 10);
          const followersGrowth = currentFollowers - yesterdaysFollowersCount;

          const currentTweets = parseInt(tweetCountStr.replace(/,/g, ''), 10);
          const tweetsGrowth = currentTweets - yesterdaysTweetCount;

          const currentListed = parseInt(listedCountStr.replace(/,/g, ''), 10);
          const listedGrowth = currentListed - yesterdaysListedCount;

          stats.xFollowersCount = followersCountStr;
          stats.xTweetCount = tweetCountStr;
          stats.xListedCount = listedCountStr;
          stats.xFollowingCount = followingCountStr;
          stats.xFollowersGrowth = followersGrowth;
          stats.xTweetsGrowth = tweetsGrowth;
          stats.xListedGrowth = listedGrowth;
        }

        results[creator.id] = stats as CreatorStatistics;
      }
    } catch (e) {
      this.logger.error('Error fetching/parsing spreadsheet.', e);
    }

    // Save to cache
    if (Object.keys(results).length > 0) {
      this.cacheRepo.set(cacheKey, results);
    }

    return results;
  }
}

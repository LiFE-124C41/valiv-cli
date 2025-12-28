import axios from 'axios';
import { Creator, CreatorStatistics } from '../domain/models.js';
import { ICacheRepository } from '../domain/interfaces.js';

export class SpreadsheetService {
  constructor(private cacheRepo: ICacheRepository) { }

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
      // Fetch the single 'daily_stats' sheet
      const sheetName = 'daily_stats';
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

      const response = await axios.get(url);
      const csvData = response.data as string;

      const lines = csvData
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Header: "Date", "Member ID", "Name", "Subscribers", "Video Count", "View Count"
      if (lines.length < 2) return {};

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

      // Group rows by member_id
      const dataByMember: Record<string, string[][]> = {};

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const row = parseLine(lines[i]);
        if (row.length < 6) continue; // Ensure we have enough columns

        const memberId = row[1]; // Index 1 is Member ID
        if (!dataByMember[memberId]) {
          dataByMember[memberId] = [];
        }
        dataByMember[memberId].push(row);
      }

      // Process each creator
      for (const creator of creators) {
        const memberRows = dataByMember[creator.id];
        if (!memberRows || memberRows.length === 0) continue;

        // Get latest row
        const latestRow = memberRows[memberRows.length - 1];

        const subscriberCountStr = latestRow[3];
        const videoCountStr = latestRow[4];
        const viewCountStr = latestRow[5];

        let yesterdaysSubscriberCount = 0;
        let yesterdaysVideoCount = 0;
        let yesterdaysViewCount = 0;
        let foundYesterday = false;

        // Find yesterday's data
        // Search backwards
        for (let i = memberRows.length - 2; i >= 0; i--) {
          const row = memberRows[i];
          if (row[0] === yesterdayStr) { // Index 0 is Date
            yesterdaysSubscriberCount = parseInt(row[3].replace(/,/g, ''), 10);
            yesterdaysVideoCount = parseInt(row[4].replace(/,/g, ''), 10);
            yesterdaysViewCount = parseInt(row[5].replace(/,/g, ''), 10);
            foundYesterday = true;
            break;
          }
        }

        // Fallback to previous record if yesterday not found
        if (!foundYesterday && memberRows.length >= 2) {
          const prevRow = memberRows[memberRows.length - 2];
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

        results[creator.id] = {
          subscriberCount: subscriberCountStr,
          videoCount: videoCountStr,
          viewCount: viewCountStr,
          subscriberGrowth: subGrowth,
          videoGrowth: videoGrowth,
          viewGrowth: viewGrowth,
        };
      }

    } catch (e) {
      console.error('Error fetching/parsing spreadsheet:', e);
      // Fail silently or return empty, depending on requirements, but error log is good
    }

    // Save to cache
    if (Object.keys(results).length > 0) {
      this.cacheRepo.set(cacheKey, results);
    }

    return results;
  }
}

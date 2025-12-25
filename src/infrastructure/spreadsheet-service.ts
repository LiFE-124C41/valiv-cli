import axios from 'axios';
import { Creator, CreatorStatistics } from '../domain/models.js';
import { ICacheRepository } from '../domain/interfaces.js';

export class SpreadsheetService {
    constructor(private cacheRepo: ICacheRepository) { }

    async getStatistics(
        spreadsheetId: string,
        creators: Creator[],
        refresh: boolean = false
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
            const cached = this.cacheRepo.get<Record<string, CreatorStatistics>>(cacheKey);
            if (cached) {
                return cached.data;
            }
        }

        await Promise.all(
            creators.map(async (creator) => {
                try {
                    // stats_bot uses 'member_id' which corresponds to creator.id
                    const sheetName = creator.id;
                    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

                    const response = await axios.get(url);
                    const csvData = response.data as string;

                    const lines = csvData.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                    // Header: "Date","Subscribers","Video Count","View Count"
                    // We need at least header + 1 row
                    if (lines.length < 2) return;

                    // Parse CSV lines (simple handling for quoted CSV from Google Sheets)
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
                        return parts.map(p => p.replace(/^"|"$/g, '')); // Remove surrounding quotes
                    };

                    // Get latest row (last line)
                    const lastLine = lines[lines.length - 1];
                    const latestData = parseLine(lastLine);
                    // [Date, Subscribers, Video Count, View Count]
                    // Date format in sheet is likely YYYY-MM-DD based on stats_bot

                    if (latestData.length < 4) return;

                    const subscriberCountStr = latestData[1];
                    const videoCountStr = latestData[2];
                    const viewCountStr = latestData[3];

                    // Try to find yesterday's data for growth calculation
                    let yesterdaysSubscriberCount = 0;
                    let yesterdaysVideoCount = 0;
                    let yesterdaysViewCount = 0;
                    let foundYesterday = false;

                    // Search backwards from before the last line
                    for (let i = lines.length - 2; i >= 1; i--) {
                        const row = parseLine(lines[i]);
                        if (row.length < 2) continue;
                        if (row[0] === yesterdayStr) {
                            yesterdaysSubscriberCount = parseInt(row[1].replace(/,/g, ''), 10);
                            if (row.length >= 3) yesterdaysVideoCount = parseInt(row[2].replace(/,/g, ''), 10);
                            if (row.length >= 4) yesterdaysViewCount = parseInt(row[3].replace(/,/g, ''), 10);
                            foundYesterday = true;
                            break;
                        }
                    }

                    // If yesterday not found by exact date, maybe use the previous row if it's close?
                    // For now strictly follow yesterday or fallback to previous record if user wants "growth since last update"?
                    // Requirement is "前日の登録者数の増加数" (increase from previous day).
                    // If update script runs daily, last row = today (or last run), prev row = yesterday (or prev run).
                    // Let's rely on prev row if date match fails, but ideally date match is better.
                    // Fallback: use previous row
                    if (!foundYesterday && lines.length >= 3) {
                        const prevLine = lines[lines.length - 2];
                        const prevData = parseLine(prevLine);
                        if (prevData.length >= 2) {
                            yesterdaysSubscriberCount = parseInt(prevData[1].replace(/,/g, ''), 10);
                            if (prevData.length >= 3) yesterdaysVideoCount = parseInt(prevData[2].replace(/,/g, ''), 10);
                            if (prevData.length >= 4) yesterdaysViewCount = parseInt(prevData[3].replace(/,/g, ''), 10);
                        }
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
                        viewGrowth: viewGrowth
                    };

                } catch (error) {
                    // Fail silently for individual creators (maybe sheet doesn't exist or network error)
                    // console.error(`Failed to fetch stats for ${creator.name}:`, error);
                }
            })
        );

        // Save to cache
        if (Object.keys(results).length > 0) {
            this.cacheRepo.set(cacheKey, results);
        }

        return results;
    }
}

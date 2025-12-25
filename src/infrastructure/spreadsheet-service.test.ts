import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SpreadsheetService } from './spreadsheet-service.js';
import { ICacheRepository } from '../domain/interfaces.js';
import { Creator } from '../domain/models.js';

vi.mock('axios');

describe('SpreadsheetService', () => {
    let service: SpreadsheetService;
    let mockCacheRepo: ICacheRepository & { get: any; set: any };
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
            delete: vi.fn(),
            clear: vi.fn(),
        };
        service = new SpreadsheetService(mockCacheRepo);
        vi.resetAllMocks();
    });

    const createCsvData = (rows: string[][]) => {
        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    };

    it('should fetch and parse statistics correctly', async () => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Headers + Yesterday + Today
        const csvData = createCsvData([
            ['Date', 'Subscribers', 'Video Count', 'View Count'],
            [yesterday, '1,000', '10', '10,000'],
            [today, '1,050', '12', '10,500']
        ]);

        (axios.get as any).mockResolvedValue({ data: csvData });

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
    });

    it('should handle CSV with quoted values containing commas', async () => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Example: "1,000" is already standard, but let's ensure the parser handles the quotes we wrapping around it.
        // The service implementation expects values to be quoted in the CSV response from Google Sheets.
        // Row format: "Date","Subscribers","Video Count","View Count"

        // Test case where values might NOT have commas inside but are quoted
        const csvData = '"Date","Subscribers","Video Count","View Count"\n' +
            `"${yesterday}","1000","10","10000"\n` +
            `"${today}","1050","12","10500"`;

        (axios.get as any).mockResolvedValue({ data: csvData });

        const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

        // 1050 - 1000
        expect(stats['creator1'].subscriberGrowth).toBe(50);
    });

    it('should use fallback row if yesterday data is missing', async () => {
        // Case: Data for "today" and "2 days ago", but no "yesterday"
        const today = new Date().toISOString().split('T')[0];
        const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

        const csvData = createCsvData([
            ['Date', 'Subscribers', 'Video Count', 'View Count'],
            [twoDaysAgo, '1,000', '10', '10,000'],
            [today, '1,100', '15', '11,000']
        ]);

        (axios.get as any).mockResolvedValue({ data: csvData });

        const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

        // It should define subscriberGrowth even if exact yesterday match fails, finding the previous row
        expect(stats['creator1'].subscriberGrowth).toBe(100);
    });

    it('should return cached data if available and not refreshing', async () => {
        const cachedData = {
            creator1: {
                subscriberCount: '5,000',
                videoCount: '50',
                viewCount: '50,000',
                subscriberGrowth: 10,
                videoGrowth: 1,
                viewGrowth: 100
            }
        };

        mockCacheRepo.get.mockReturnValue({ data: cachedData });

        const stats = await service.getStatistics(mockSpreadsheetId, mockCreators, false);

        expect(stats).toEqual(cachedData);
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('should ignore cache if refreshing', async () => {
        const cachedData = { some: 'data' };
        mockCacheRepo.get.mockReturnValue({ data: cachedData });

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const csvData = createCsvData([
            ['Date', 'Subscribers', 'Video Count', 'View Count'],
            [yesterday, '100', '1', '1000'],
            [today, '200', '2', '2000']
        ]);
        (axios.get as any).mockResolvedValue({ data: csvData });

        await service.getStatistics(mockSpreadsheetId, mockCreators, true);

        expect(axios.get).toHaveBeenCalled();
    });

    it('should gracefully handle network errors', async () => {
        (axios.get as any).mockRejectedValue(new Error('Network Error'));

        const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);

        expect(stats).toEqual({});
    });

    it('should handle malformed CSV data', async () => {
        (axios.get as any).mockResolvedValue({ data: 'invalid keys' });
        const stats = await service.getStatistics(mockSpreadsheetId, mockCreators);
        expect(stats).toEqual({});
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummarizeService } from './summarize-service.js';

// Mock dependencies
const mocks = vi.hoisted(() => {
  const generateContentMock = vi.fn();

  class GoogleGenerativeAIMock {
    getGenerativeModel() {
      return {
        generateContent: generateContentMock,
      };
    }
  }

  return {
    fetchTranscript: vi.fn(),
    generateContent: generateContentMock,
    GoogleGenerativeAI: GoogleGenerativeAIMock,
  };
});

vi.mock('youtube-transcript-plus', () => {
  return {
    YoutubeTranscript: {
      fetchTranscript: mocks.fetchTranscript,
    },
  };
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: mocks.GoogleGenerativeAI,
  };
});

vi.mock('./transcript-cache-repository.js', () => {
  return {
    TranscriptCacheRepository: class {
      getTranscript = vi.fn().mockReturnValue(null);
      saveTranscript = vi.fn();
    },
  };
});

describe('SummarizeService', () => {
  let service: SummarizeService;
  let loggerMock: { info: Mock; warn: Mock; error: Mock; debug: Mock };

  beforeEach(() => {
    loggerMock = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    service = new SummarizeService(loggerMock as unknown as ILogger);
    vi.clearAllMocks();
    mocks.fetchTranscript.mockReset();
    mocks.generateContent.mockReset();

    // Default Gemini response
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () => 'Mock Summary',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 10,
          totalTokenCount: 20,
        },
      },
    });
  });

  describe('summarizeVideo', () => {
    it('should include timestamps in the prompt when transcript is fetched successfully', async () => {
      // Mock YoutubeTranscript response
      mocks.fetchTranscript.mockResolvedValue([
        { text: 'Hello', offset: 0, duration: 1 },
        { text: 'World', offset: 65, duration: 1 }, // 1m 5s
      ]);

      const result = await service.summarizeVideo('video123', 'fake-api-key');

      expect(result).toContain('Mock Summary');
      expect(result).toContain('[Gemini Usage]');

      // Check if prompt contained timestamps
      const calledPrompt = mocks.generateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('[00:00] Hello');
      expect(calledPrompt).toContain('[01:05] World');
    });

    it('should handle zero padding correctly in timestamps', async () => {
      mocks.fetchTranscript.mockResolvedValue([
        { text: 'Start', offset: 9, duration: 1 }, // 00:09
        { text: 'Middle', offset: 60, duration: 1 }, // 01:00
      ]);

      await service.summarizeVideo('video123', 'fake-api-key');

      const calledPrompt = mocks.generateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('[00:09] Start');
      expect(calledPrompt).toContain('[01:00] Middle');
    });

    it('should handle hour format timestamps correctly', async () => {
      mocks.fetchTranscript.mockResolvedValue([
        { text: 'Start', offset: 3605, duration: 1 }, // 01:00:05
        { text: 'End', offset: 7320, duration: 1 }, // 02:02:00
      ]);

      await service.summarizeVideo('video123', 'fake-api-key');

      const calledPrompt = mocks.generateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('[01:00:05] Start');
      expect(calledPrompt).toContain('[02:02:00] End');
    });
  });

  describe('fetchManualTranscript (fallback)', () => {
    it('should correctly format timestamps from manual fetch (fallback)', async () => {
      // Mock YoutubeTranscript to throw error to trigger fallback
      mocks.fetchTranscript.mockRejectedValue(new Error('Library failed'));

      // Mock global fetch for fallback
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      // 1. First fetch: Watch Page HTML
      mockFetch.mockResolvedValueOnce({
        text: () =>
          Promise.resolve(
            '<html>"captionTracks":[{"baseUrl":"http://example.com/captions","languageCode":"ja"}]</html>',
          ),
      });

      // 2. Second fetch: Caption JSON
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            events: [
              { tStartMs: 0, segs: [{ utf8: 'Manual' }] },
              { tStartMs: 65000, segs: [{ utf8: 'Fallback' }] }, // 65s = 01:05
            ],
          }),
      });

      await service.summarizeVideo('video123', 'fake-api-key');

      // Verify prompt contains fallback content with timestamps
      const calledPrompt = mocks.generateContent.mock.calls[0][0];
      expect(calledPrompt).toContain('[00:00] Manual');
      expect(calledPrompt).toContain('[01:05] Fallback');
    });
  });
});

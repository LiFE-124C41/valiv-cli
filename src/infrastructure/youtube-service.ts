import Parser from 'rss-parser';
import { Activity, Creator } from '../domain/models.js';
import { IActivityService, ICacheRepository } from '../domain/interfaces.js';

interface YouTubeChannelStatistics {
  subscriberCount: string;
}

interface YouTubeChannelItem {
  id: string;
  statistics: YouTubeChannelStatistics;
}

interface YouTubeChannelResponse {
  items: YouTubeChannelItem[];
}

export class YouTubeService implements IActivityService {
  private parser: Parser;

  constructor(private cacheRepo: ICacheRepository) {
    this.parser = new Parser({
      customFields: {
        item: [['media:group', 'media']],
      },
    });
  }

  async getActivities(
    creators: Creator[],
    forceRefresh = false,
  ): Promise<Activity[]> {
    const cacheKey = 'youtube_activities';
    const cached = this.cacheRepo.get<Activity[]>(cacheKey);
    const now = new Date();

    if (!forceRefresh && cached) {
      const cacheDate = new Date(cached.timestamp);
      if (
        cacheDate.getDate() === now.getDate() &&
        cacheDate.getMonth() === now.getMonth() &&
        cacheDate.getFullYear() === now.getFullYear()
      ) {
        // Restore Date objects
        return cached.data.map((a) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
      }
    }

    const promises = creators
      .filter((c) => c.youtubeChannelId)
      .map(async (creator) => {
        try {
          const feed = await this.parser.parseURL(
            `https://www.youtube.com/feeds/videos.xml?channel_id=${creator.youtubeChannelId}`,
          );

          return feed.items.map((item) => {
            let views: number | undefined;
            if (item['media'] && item['media']['media:community']) {
              const statistics =
                item['media']['media:community'][0]['media:statistics'];
              if (statistics && statistics[0] && statistics[0]['$']) {
                views = parseInt(statistics[0]['$']['views'], 10);
              }
            }

            return {
              id: item.id || item.link || '',
              title: item.title || '',
              url: item.link || '',
              platform: 'youtube' as const,
              type: 'video' as const, // RSS doesn't distinguish live/video easily
              timestamp: new Date(item.pubDate || item.isoDate || Date.now()),
              author: creator,
              views,
            };
          });
        } catch (error) {
          console.error(
            `Failed to fetch YouTube feed for ${creator.name}:`,
            error,
          );
          return [];
        }
      });

    const results = await Promise.all(promises);
    const activities = results
      .flat()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    this.cacheRepo.set(cacheKey, activities);
    return activities;
  }

  async getChannelInfo(channelId: string): Promise<{ title: string } | null> {
    try {
      const feed = await this.parser.parseURL(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      );
      return {
        title: feed.title || '',
      };
    } catch (error) {
      console.error(`Failed to fetch channel info for ${channelId}:`, error);
      return null;
    }
  }

  async getChannelStatistics(
    channelId: string,
    apiKey: string,
  ): Promise<{ subscriberCount?: string } | null> {
    // Legacy single fetch - keeping for backward compatibility if needed,
    // but getSubscriberCounts should be preferred.
    // implementation omitted or kept as wrapper
    const result = await this.getSubscriberCounts([channelId], apiKey);
    const count = result[channelId];
    return count ? { subscriberCount: count } : null;
  }

  async getSubscriberCounts(
    channelIds: string[],
    apiKey: string,
    forceRefresh = false,
  ): Promise<Record<string, string>> {
    const cacheKey = 'youtube_subscriber_counts';
    const cached = this.cacheRepo.get<Record<string, string>>(cacheKey);
    const now = new Date();
    const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

    if (!forceRefresh && cached) {
      const cacheTime = cached.timestamp;
      if (now.getTime() - cacheTime < CACHE_DURATION_MS) {
        return cached.data;
      }
    }

    // Batch fetch (YouTube API allows up to 50 IDs)
    // For simplicity assuming < 50 creators for now.
    // If more, would need chunking.
    const uniqueIds = [...new Set(channelIds)].filter(Boolean);
    if (uniqueIds.length === 0) return {};

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${uniqueIds.join(',')}&key=${apiKey}`,
      );

      if (!response.ok) {
        throw new Error(`YouTube API Error: ${response.statusText}`);
      }

      const data = (await response.json()) as YouTubeChannelResponse;
      const result: Record<string, string> = {};

      if (data.items) {
        for (const item of data.items) {
          // item.id is needed to map back, but YouTubeChannelResponse/Item definition needs 'id'
          // We need to update the interface to include 'id'
          if (item.id && item.statistics && item.statistics.subscriberCount) {
            result[item.id] = item.statistics.subscriberCount;
          }
        }
      }

      this.cacheRepo.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to fetch subscriber counts:', error);
      // Return cached data if available even if expired, as fallback?
      if (cached) return cached.data;
      return {};
    }
  }
}

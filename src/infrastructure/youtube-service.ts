import Parser from 'rss-parser';
import { Activity, Creator } from '../domain/models.js';
import { IActivityService, ICacheRepository } from '../domain/interfaces.js';

export class YouTubeService implements IActivityService {
  private parser: Parser;

  constructor(private cacheRepo: ICacheRepository) {
    this.parser = new Parser();
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

          return feed.items.map((item) => ({
            id: item.id || item.link || '',
            title: item.title || '',
            url: item.link || '',
            platform: 'youtube' as const,
            type: 'video' as const, // RSS doesn't distinguish live/video easily
            timestamp: new Date(item.pubDate || item.isoDate || Date.now()),
            author: creator,
          }));
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
}

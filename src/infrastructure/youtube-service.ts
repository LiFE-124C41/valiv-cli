import Parser from 'rss-parser';
import { Activity, Creator } from '../domain/models.js';
import { IActivityService, ICacheRepository } from '../domain/interfaces.js';

export interface YouTubeChannelStatistics {
  subscriberCount: string;
  viewCount: string;
  videoCount: string;
}

interface YouTubeChannelItem {
  id: string;
  statistics: YouTubeChannelStatistics;
}

interface YouTubeChannelResponse {
  items: YouTubeChannelItem[];
}

interface YouTubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    channelId: string;
    liveBroadcastContent?: string;
  };
  liveStreamingDetails?: {
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    actualStartTime?: string;
    actualEndTime?: string;
    concurrentViewers?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
}

interface YouTubeVideoResponse {
  items: YouTubeVideoItem[];
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

  async getUpcomingStreams(
    creators: Creator[],
    apiKey: string,
  ): Promise<import('../domain/models.js').ScheduleEvent[]> {
    const promises = creators
      .filter((c) => c.youtubeChannelId)
      .map(async (creator) => {
        try {
          // 1. Search for upcoming videos
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${creator.youtubeChannelId}&eventType=upcoming&type=video&key=${apiKey}`;
          const searchRes = await fetch(searchUrl);
          if (!searchRes.ok) return [];
          const searchData = (await searchRes.json()) as YouTubeSearchResponse;

          if (!searchData.items || searchData.items.length === 0) return [];

          // 2. Get video details for scheduled time
          const videoIds = searchData.items
            .map((item) => item.id.videoId)
            .join(',');
          const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoIds}&key=${apiKey}`;
          const videosRes = await fetch(videosUrl);
          if (!videosRes.ok) return [];
          const videosData = (await videosRes.json()) as YouTubeVideoResponse;

          if (!videosData.items) return [];

          return videosData.items.map((video) => {
            const startTime = video.liveStreamingDetails?.scheduledStartTime
              ? new Date(video.liveStreamingDetails.scheduledStartTime)
              : new Date();

            const endTime = video.liveStreamingDetails?.scheduledEndTime
              ? new Date(video.liveStreamingDetails.scheduledEndTime)
              : undefined;

            return {
              id: video.id,
              title: video.snippet.title,
              startTime: startTime,
              endTime: endTime,
              url: `https://www.youtube.com/watch?v=${video.id}`,
              platform: 'youtube' as const,
              author: creator,
              description: 'YouTube Scheduled Stream', // Description unavailable in search/video snippet usually truncated or needed specifically
            };
          });
        } catch (error) {
          console.error(
            `Failed to fetch upcoming streams for ${creator.name}:`,
            error,
          );
          return [];
        }
      });

    const results = await Promise.all(promises);
    return results
      .flat()
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getLiveStreams(
    creators: Creator[],
    apiKey: string,
  ): Promise<import('../domain/models.js').ScheduleEvent[]> {
    const promises = creators
      .filter((c) => c.youtubeChannelId)
      .map(async (creator) => {
        try {
          // 1. Search for live videos
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${creator.youtubeChannelId}&eventType=live&type=video&key=${apiKey}`;
          const searchRes = await fetch(searchUrl);
          if (!searchRes.ok) return [];
          const searchData = (await searchRes.json()) as YouTubeSearchResponse;

          if (!searchData.items || searchData.items.length === 0) return [];

          // 2. Get video details for concurrent viewers
          const videoIds = searchData.items
            .map((item) => item.id.videoId)
            .join(',');
          const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${videoIds}&key=${apiKey}`;
          const videosRes = await fetch(videosUrl);
          if (!videosRes.ok) return [];
          const videosData = (await videosRes.json()) as YouTubeVideoResponse;

          if (!videosData.items) return [];

          return videosData.items.map((video) => {
            return {
              id: video.id,
              title: video.snippet.title,
              startTime: new Date(
                video.liveStreamingDetails?.actualStartTime ||
                  video.liveStreamingDetails?.scheduledStartTime ||
                  Date.now(),
              ),
              url: `https://www.youtube.com/watch?v=${video.id}`,
              platform: 'youtube' as const,
              author: creator,
              description: 'YouTube Live Stream',
              status: 'live' as const,
              concurrentViewers:
                video.liveStreamingDetails?.concurrentViewers || '0',
              likeCount: video.statistics?.likeCount || '0',
            };
          });
        } catch (error) {
          console.error(
            `Failed to fetch live streams for ${creator.name}:`,
            error,
          );
          return [];
        }
      });

    const results = await Promise.all(promises);
    return results
      .flat()
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async getActivities(
    creators: Creator[],
    forceRefresh = false,
    apiKey?: string,
  ): Promise<Activity[]> {
    const cacheKey = 'youtube_activities';
    const cached = this.cacheRepo.get<Activity[]>(cacheKey);
    const now = new Date();

    if (!forceRefresh && cached) {
      const cacheDate = new Date(cached.timestamp);
      // Determine invalidation rule:
      // If cached data has API enrichment (checked by checking if any item has 'status'),
      // we might want to refresh more often (e.g., to update live status/viewers).
      // For now, keeping simple daily cache but handling "refresh" flag is key.
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
              status: 'video' as const,
            } as Activity;
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
    let activities = results
      .flat()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Enrich with API if available
    if (apiKey && activities.length > 0) {
      activities = await this.enrichActivitiesWithApi(activities, apiKey);
      // Re-sort because timestamps might have changed
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    this.cacheRepo.set(cacheKey, activities);
    return activities;
  }

  private async enrichActivitiesWithApi(
    activities: Activity[],
    apiKey: string,
  ): Promise<Activity[]> {
    try {
      // Chunk IDs (max 50)
      const videoIds = activities.map((a) => a.id.replace('yt:video:', '')); // RSS often has "yt:video:ID"
      const uniqueIds = [...new Set(videoIds)];

      const chunkSize = 50;
      const chunks = [];
      for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        chunks.push(uniqueIds.slice(i, i + chunkSize));
      }

      const enrichedMap = new Map<string, Partial<Activity>>();

      for (const chunk of chunks) {
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics,snippet&id=${chunk.join(',')}&key=${apiKey}`;
        const res = await fetch(videosUrl);
        if (!res.ok) continue;
        const data = (await res.json()) as YouTubeVideoResponse;

        if (data.items) {
          for (const item of data.items) {
            const stats = item.statistics;
            const liveDetails = item.liveStreamingDetails;
            const snippet = item.snippet;

            let status: 'live' | 'upcoming' | 'video' = 'video';
            if (liveDetails) {
              if (liveDetails.actualStartTime && !liveDetails.actualEndTime) {
                status = 'live';
              } else if (
                liveDetails.scheduledStartTime &&
                !liveDetails.actualStartTime
              ) {
                status = 'upcoming';
              }
            }

            // If snippet.liveBroadcastContent says 'live', trust it
            if (snippet?.liveBroadcastContent === 'live') {
              status = 'live';
            } else if (snippet?.liveBroadcastContent === 'upcoming') {
              status = 'upcoming';
            }

            let newTimestamp: Date | undefined;
            if (liveDetails) {
              if (liveDetails.actualStartTime) {
                newTimestamp = new Date(liveDetails.actualStartTime);
              } else if (liveDetails.scheduledStartTime) {
                newTimestamp = new Date(liveDetails.scheduledStartTime);
              }
            }

            enrichedMap.set(item.id, {
              views: stats?.viewCount
                ? parseInt(stats.viewCount, 10)
                : undefined,
              status,
              concurrentViewers: liveDetails?.concurrentViewers,
              likeCount: stats?.likeCount,
              timestamp: newTimestamp,
            });
          }
        }
      }

      return activities.map((activity) => {
        const videoId = activity.id.replace('yt:video:', '');
        const enrichment = enrichedMap.get(videoId);
        if (enrichment) {
          return {
            ...activity,
            ...enrichment,
            // If API provided a timestamp (actual/scheduled start), use it.
            // Otherwise fall back to original RSS timestamp.
            timestamp: enrichment.timestamp || activity.timestamp,
          };
        }
        return activity;
      });
    } catch (error) {
      console.error('Failed to enrich activities with API:', error);
      return activities;
    }
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
    const stats = result[channelId];
    return stats ? { subscriberCount: stats.subscriberCount } : null;
  }

  async getSubscriberCounts(
    channelIds: string[],
    apiKey: string,
    forceRefresh = false,
  ): Promise<Record<string, YouTubeChannelStatistics>> {
    const cacheKey = 'youtube_channel_statistics';
    const cached =
      this.cacheRepo.get<Record<string, YouTubeChannelStatistics>>(cacheKey);
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
      const result: Record<string, YouTubeChannelStatistics> = {};

      if (data.items) {
        for (const item of data.items) {
          // item.id is needed to map back, but YouTubeChannelResponse/Item definition needs 'id'
          // We need to update the interface to include 'id'
          if (item.id && item.statistics) {
            result[item.id] = {
              subscriberCount: item.statistics.subscriberCount,
              viewCount: item.statistics.viewCount,
              videoCount: item.statistics.videoCount,
            };
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

import axios from 'axios';
import { Creator, Activity, ScheduleEvent } from '../domain/models.js';
import { ICacheRepository } from '../domain/interfaces.js';

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
}

interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
  is_mature: boolean;
}

interface TwitchScheduleSegment {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  canceled_until: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  is_recurring: boolean;
}

interface TwitchPagination {
  cursor?: string;
}

interface TwitchVideo {
  id: string;
  stream_id: string | null;
  user_id: string;
  user_login: string;
  user_name: string;
  title: string;
  description: string;
  created_at: string;
  published_at: string;
  url: string;
  thumbnail_url: string;
  viewable: string;
  view_count: number;
  language: string;
  type: string;
  duration: string;
}

export class TwitchService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private cacheRepo: ICacheRepository,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.post<TwitchTokenResponse>(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
          params: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'client_credentials',
          },
        },
      );

      this.accessToken = response.data.access_token;
      // Expires in seconds, so convert to ms and subtract a buffer (e.g., 60s)
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get Twitch access token:', error);
      throw new Error('Twitch Authentication Failed');
    }
  }

  private async makeRequest<T>(
    url: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const response = await axios.get<T>(url, {
      headers: {
        'Client-ID': this.clientId,
        Authorization: `Bearer ${token}`,
      },
      params,
    });
    return response.data;
  }

  async getChannelInfo(username: string): Promise<TwitchUser | null> {
    try {
      const data = await this.makeRequest<{ data: TwitchUser[] }>(
        'https://api.twitch.tv/helix/users',
        {
          login: username,
        },
      );
      return data.data[0] || null;
    } catch (error) {
      console.error(`Failed to fetch Twitch user info for ${username}:`, error);
      return null;
    }
  }

  async getLiveStreams(creators: Creator[]): Promise<Activity[]> {
    const userLogins = creators
      .filter((c) => c.twitchChannelId) // Assuming twitchChannelId stores the username/login or user ID.
      // User might enter 'user_id' or 'login'. Usually 'login' (username) is easier for configuration.
      // Let's assume twitchChannelId is the username (login) for now, as that's user friendly.
      // If it's ID, we need to adjust params to 'user_id'.
      // Usually users know their URL twitch.tv/username -> username.
      .map((c) => c.twitchChannelId);

    if (userLogins.length === 0) return [];

    try {
      // Twitch API allows up to 100 users per request
      const chunks = [];
      for (let i = 0; i < userLogins.length; i += 100) {
        chunks.push(userLogins.slice(i, i + 100));
      }

      const streams: TwitchStream[] = [];
      for (const chunk of chunks) {
        // Checking if channelId looks like numeric ID or username
        // Since we don't strictly validator, let's try 'user_login' first which equates to username.
        const data = await this.makeRequest<{ data: TwitchStream[] }>(
          'https://api.twitch.tv/helix/streams',
          {
            user_login: chunk,
          },
        );
        streams.push(...data.data);
      }

      return streams.map((stream) => {
        const creator = creators.find(
          (c) =>
            c.twitchChannelId?.toLowerCase() ===
              stream.user_login.toLowerCase() ||
            c.twitchChannelId === stream.user_id,
        );

        return {
          id: `twitch:${stream.id}`,
          title: stream.title,
          url: `https://www.twitch.tv/${stream.user_login}`,
          platform: 'twitch',
          type: 'live', // Twitch streams are always "live" when fetched here
          timestamp: new Date(stream.started_at),
          thumbnailUrl: stream.thumbnail_url
            .replace('{width}', '320')
            .replace('{height}', '180'),
          description: stream.game_name
            ? `Playing ${stream.game_name}`
            : 'Live Stream',
          author: creator,
          views: 0, // Not really "views" but current viewers could be mapped elsewhere or just left 0
          status: 'live',
          concurrentViewers: stream.viewer_count.toString(),
        } as Activity;
      });
    } catch (error) {
      console.error('Failed to fetch Twitch live streams:', error);
      return [];
    }
  }

  async getUpcomingSchedules(creators: Creator[]): Promise<ScheduleEvent[]> {
    const creatorsWithTwitch = creators.filter((c) => c.twitchChannelId);
    if (creatorsWithTwitch.length === 0) return [];

    const events: ScheduleEvent[] = [];

    // Schedule API does not support bulk user fetching easily (need 'broadcaster_id' single param)
    // Have to loop.
    for (const creator of creatorsWithTwitch) {
      try {
        // Need ID for schedule API, but config might have username.
        // Cache user ID if possible or fetch it.
        // For optimization, resolve IDs from User API first if needed.
        // Assuming twitchChannelId IS the username, we first need to resolve to numerical ID.
        // This is costly 1-by-1.
        // Let's resolve all IDs first.
        const userInfo = await this.getChannelInfo(creator.twitchChannelId!);
        if (!userInfo) continue;

        const data = await this.makeRequest<{
          data: { segments: TwitchScheduleSegment[] };
          pagination: TwitchPagination;
        }>('https://api.twitch.tv/helix/schedule', {
          broadcaster_id: userInfo.id,
          first: 10, // Get next 10 items
        });

        if (data.data?.segments) {
          const segments = data.data.segments;
          segments.forEach((segment) => {
            if (!segment.canceled_until) {
              events.push({
                id: `twitch:schedule:${segment.id}`,
                title: segment.title,
                startTime: new Date(segment.start_time),
                endTime: new Date(segment.end_time),
                url: `https://www.twitch.tv/${creator.twitchChannelId}`,
                platform: 'twitch',
                author: creator,
                status: 'upcoming',
                description: segment.category
                  ? `Category: ${segment.category.name}`
                  : undefined,
              });
            }
          });
        }
      } catch (error) {
        // Schedule API returns 404 if no schedule is set, which is fine.
        // Just ignore and continue.
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          continue;
        }
        console.error(`Failed to fetch schedule for ${creator.name}:`, error);
      }
    }

    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getRecentVideos(creators: Creator[]): Promise<Activity[]> {
    const creatorsWithTwitch = creators.filter((c) => c.twitchChannelId);
    if (creatorsWithTwitch.length === 0) return [];

    const activities: Activity[] = [];

    for (const creator of creatorsWithTwitch) {
      try {
        // Resolve User ID
        const userInfo = await this.getChannelInfo(creator.twitchChannelId!);
        if (!userInfo) continue;

        const data = await this.makeRequest<{ data: TwitchVideo[] }>(
          'https://api.twitch.tv/helix/videos',
          {
            user_id: userInfo.id,
            type: 'archive', // Get past broadcasts
            first: 5, // Limit to recent 5
          },
        );

        if (data.data) {
          const videos = data.data.map(
            (video) =>
              ({
                id: `twitch:video:${video.id}`,
                title: video.title,
                url: video.url,
                platform: 'twitch',
                type: 'video',
                timestamp: new Date(video.created_at), // or published_at
                thumbnailUrl: video.thumbnail_url
                  .replace('%{width}', '320')
                  .replace('%{height}', '180'),
                description: video.description,
                author: creator,
                views: video.view_count, // VOD views
                status: 'video',
                duration: video.duration, // We might want to parse this if needed but Activity doesn't strictly adhere to duration
              }) as Activity,
          );
          activities.push(...videos);
        }
      } catch (error) {
        console.error(`Failed to fetch videos for ${creator.name}:`, error);
      }
    }

    return activities.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }
}

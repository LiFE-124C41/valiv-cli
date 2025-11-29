import Parser from 'rss-parser';
import { Activity, Creator } from '../domain/models';
import { IActivityService } from '../domain/interfaces';

export class YouTubeService implements IActivityService {
    private parser: Parser;

    constructor() {
        this.parser = new Parser();
    }

    async getActivities(creators: Creator[]): Promise<Activity[]> {
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
        return results.flat().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
}

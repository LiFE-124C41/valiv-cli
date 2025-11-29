export type Platform = 'youtube' | 'twitch' | 'x' | 'calendar';
export type ActivityType = 'live' | 'video' | 'post' | 'schedule';

export interface Creator {
    /** 内部識別子（名前から生成、スペースはアンダースコアに置換） */
    id: string;
    /** 表示名 */
    name: string;
    /** YouTubeチャンネルID (例: UC...) */
    youtubeChannelId?: string;
    /** TwitchチャンネルID */
    twitchChannelId?: string;
    /** Xユーザー名 (@なし) */
    xUsername?: string;
    /** Google Calendar iCal URL */
    calendarUrl?: string;
}

export interface Activity {
    /** 活動の一意なID (動画IDなど) */
    id: string;
    /** タイトル */
    title: string;
    /** リンクURL */
    url: string;
    /** プラットフォーム */
    platform: Platform;
    /** 活動タイプ */
    type: ActivityType;
    /** 発生日時 */
    timestamp: Date;
    /** サムネイル画像URL */
    thumbnailUrl?: string;
    /** 説明文 */
    description?: string;
    /** 活動を行ったクリエイター */
    author?: Creator;
}

export interface ScheduleEvent {
    /** イベントID */
    id: string;
    /** イベントタイトル */
    title: string;
    /** 開始日時 */
    startTime: Date;
    /** 終了日時 */
    endTime?: Date;
    /** 関連URL */
    url?: string;
    /** 詳細説明 */
    description?: string;
    /** プラットフォーム (デフォルト: calendar) */
    platform: Platform;
}

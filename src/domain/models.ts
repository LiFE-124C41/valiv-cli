export type Platform = 'youtube' | 'twitch' | 'x' | 'calendar';
export type ActivityType = 'live' | 'video' | 'post' | 'schedule';

export interface Creator {
  /** 内部識別子（名前から生成、スペースはアンダースコアに置換） */
  id: string;
  /** 表示名 */
  name: string;
  /** テーマカラー (HEX) */
  color?: string;
  /** シンボル (Emoji) */
  symbol?: string;
  /** YouTubeチャンネルID (例: UC...) */
  youtubeChannelId?: string;
  /** TwitchチャンネルID */
  twitchChannelId?: string;
  /** Xユーザー名 (@なし) */
  xUsername?: string;
  /** Google Calendar iCal URL */
  calendarUrl?: string;
}

export interface CreatorStatistics {
  /** 登録者数 */
  subscriberCount: string;
  /** 総再生回数 */
  viewCount: string;
  /** 動画数 */
  videoCount: string;
  /** 前日比（登録者数増加） */
  subscriberGrowth?: number;
  /** 前日比（再生数増加） */
  viewGrowth?: number;
  /** 前日比（動画数増加） */
  videoGrowth?: number;
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
  /** 再生数 (RSSから取得、またはAPIから補完) */
  views?: number;
  /** ステータス (live | upcoming | video) - API連携時のみ有効 */
  status?: 'live' | 'upcoming' | 'video';
  /** 同時視聴者数 (liveの場合のみ) - API連携時のみ有効 */
  concurrentViewers?: string;
  /** 高評価数 - API連携時のみ有効 */
  likeCount?: string;
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
  /** イベントの作成者 */
  author?: Creator;
  /** ステータス (upcoming | live) */
  status?: 'upcoming' | 'live';
  /** 同時視聴者数 (liveの場合のみ) */
  concurrentViewers?: string;
  /** 高評価数 (liveの場合のみ) */
  likeCount?: string;
}

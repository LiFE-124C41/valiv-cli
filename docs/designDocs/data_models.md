# データモデル仕様書

## 概要
`valiv` で扱われる主要なデータ構造（ドメインモデル）の定義です。
TypeScriptの型定義として表現されます。

## 列挙型 (Enums / Union Types)

### Platform
サポートするプラットフォームを定義します。
```typescript
export type Platform = 'youtube' | 'twitch' | 'x' | 'calendar';
```

### ActivityType
活動の種類を定義します。
```typescript
export type ActivityType = 'live' | 'video' | 'post' | 'schedule';
```

## エンティティ (Entities)

### Creator
追跡対象のクリエイター（推し）を表します。

```typescript
export interface Creator {
  /** 内部識別子（名前から生成、スペースはアンダースコアに置換） */
  id: string;
  /** 表示名 */
  name: string;
  /** テーマカラー (HEX) */
  color?: string;
  /** YouTubeチャンネルID (例: UC...) */
  youtubeChannelId?: string;
  /** TwitchチャンネルID */
  twitchChannelId?: string;
  /** Xユーザー名 (@なし) */
  xUsername?: string;
  /** Google Calendar iCal URL */
  calendarUrl?: string;
}
```

### VALIV_MEMBERS
初期登録されるメンバーのリストです。

```typescript
export const VALIV_MEMBERS: Creator[] = [
  {
    id: "manaka_tomori",
    name: "Manaka Tomori",
    color: "#FF4554",
    youtubeChannelId: "UCuWoH9mx0EgT69UyVxaw1NQ",
    xUsername: "TomoriManaka",
    calendarUrl: "https://calendar.google.com/calendar/ical/45b6df683e8a17b6822cd6463d400d3a235229b6b63328a2e6fa0bcbee442340%40group.calendar.google.com/public/basic.ics"
  },
  {
    id: "cosmo_kamizuru",
    name: "Cosmo Kamizuru",
    color: "#56CCF2",
    youtubeChannelId: "UCU8VGKDhiSHLerg4wYXjhtw",
    xUsername: "KamizuruCosmo",
    calendarUrl: "https://calendar.google.com/calendar/ical/51576d690911e40db18810783ba3f5a333e992c4ba2da9f050fad0043c694639%40group.calendar.google.com/public/basic.ics"
  },
  {
    id: "sara_letora_oliveira_utagawa",
    name: "Sara Letora Oliveira Utagawa",
    color: "#D7F930",
    youtubeChannelId: "UCBpLt5oWnDnG1ni5f33gcEQ",
    twitchChannelId: "utagawaletora",
    xUsername: "UtagawaLetora",
    calendarUrl: "https://calendar.google.com/calendar/ical/b915dd1023522bec7ac6e86a3bbbe5e97ea20215977db795979c88f74f900ed5%40group.calendar.google.com/public/basic.ics"
  },
  {
    id: "valiv_official",
    name: "va-liv official",
    color: "#656A75",
    youtubeChannelId: "UC7r2U8wAxsXHCMz9XlMWo4w",
    xUsername: "valiv_official",
    calendarUrl: "https://calendar.google.com/calendar/ical/valiv.schedule%40gmail.com/public/basic.ics"
  }
];
```

### Activity
過去または現在の活動（動画投稿、配信開始など）を表します。

```typescript
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
  /** 発生日時 (ISO 8601 string or Date object) */
  timestamp: Date;
  /** サムネイル画像URL */
  thumbnailUrl?: string;
  /** 説明文 */
  description?: string;
  /** 活動を行ったクリエイター */
  author?: Creator;
}
```

### ScheduleEvent
将来の予定を表します。

```typescript
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
}
```

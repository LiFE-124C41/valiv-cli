# アーキテクチャ設計書

## 概要
本プロジェクト `valiv` は、YouTuberファンのための活動確認CLIツールです。
リッチなUIと高い保守性を実現するため、**TypeScript** と **Ink** を採用し、**クリーンアーキテクチャ** に基づいて設計されています。

## アーキテクチャ図
依存関係は原則として **内側（Domain）** に向かってのみ発生します。

```mermaid
graph TD
    Presentation[Presentation Layer<br>(CLI, UI Components)] --> Usecase[Usecase Layer<br>(Application Logic)]
    Presentation --> Infrastructure[Infrastructure Layer<br>(API Clients, Config)]
    Infrastructure --> Domain[Domain Layer<br>(Models, Interfaces)]
    Usecase --> Domain
    
    subgraph Core
        Domain
        Usecase
    end
```

## ディレクトリ構成

```
src/
├── domain/           # ドメイン層: ビジネスロジックの中核
│   ├── models.ts     # エンティティ定義 (Creator, Activityなど)
│   └── interfaces.ts # リポジトリやサービスのインターフェース定義
├── usecase/          # ユースケース層: アプリケーション固有のビジネスルール
│   └── (Future work) # 現状はPresentation層やServiceにロジックが含まれる
├── infrastructure/   # インフラストラクチャ層: 外部との通信、詳細実装
│   ├── youtube-service.ts  # YouTube RSS処理
│   ├── calendar-service.ts # Google Calendar iCal処理
│   ├── video-player-service.ts # 動画再生 (MPV/Browser)
│   ├── config-repository.ts # 設定ファイル読み書き
│   └── cache-repository.ts # データキャッシュ (conf)
├── ui/               # プレゼンテーション層 (UI): Inkコンポーネント
│   ├── App.tsx       # メインコンポーネント
│   ├── components/   # 再利用可能なUI部品
│   └── screens/      # 各画面 (List, Check, Schedule)
└── cli.tsx           # エントリーポイント (Commander + Ink)
```

## 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **パッケージ管理**: npm
- **CLIフレームワーク**: Commander.js (コマンド定義), Ink (React for CLI)
- **HTTPクライアント**: axios または fetch
- **RSSパース**: rss-parser
- **カレンダー処理**: node-ical
- **動画再生**: node-mpv (MPV連携)
- **テスト**: Vitest

## 設計原則

1.  **依存性の逆転**: 上位モジュール（ビジネスロジック）は下位モジュール（詳細実装）に依存せず、抽象（インターフェース）に依存する。
2.  **関心の分離**: UI（Inkコンポーネント）、ビジネスロジック、データアクセスを分離する。
3.  **テスト容易性**: 外部サービスへの依存をインターフェース経由にすることで、モックを用いたテストを容易にする。

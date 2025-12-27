# valiv

**valiv** は、アイドルマスター vα-liv (ヴイアラ) メンバーの活動をまとめてチェックするための CLI ツールです。
YouTube, X, Google Calendar などの情報を集約し、灯里愛夏、上水流宇宙、レトラの最新情報をターミナルから手軽に確認できます。

## 特徴

*   📺 **Activity Check**: メンバー（灯里愛夏、上水流宇宙、レトラ）の最新動画や配信状況を一覧表示
*   📅 **Schedule**: 公式 Google Calendar からスケジュールを取得して表示
*   🤖 **AI Summary**: Gemini API を使用して動画の内容を要約
*   🎵 **Audio Player**: 音声のみの再生やプレイリスト再生に対応

## インストール

### 一般ユーザー向け

`npm` を使用してインストールします。

```bash
npm install -g valiv-cli
```

### 開発者向け

このプロジェクトは `npm` を使用して管理されています。

```bash
git clone https://github.com/yourusername/valiv-cli.git
cd valiv-cli
npm install
```

## 使い方

インストール後、`valiv` コマンドが使用可能になります。

### 初期設定

最初に初期化を行い、設定ファイルを作成します。
実行すると vα-liv メンバー（灯里愛夏、上水流宇宙、レトラ、公式）のデータが自動的に登録され、すぐに利用を開始できます。

初期化プロセス中に以下のAPIキーの入力を求められます（スキップ可能）。

1.  **YouTube Data API v3 Key** (Token)
    *   `list` コマンドでのチャンネル登録者数表示
    *   `schedule` コマンドでの正確な配信予定取得（YouTube Data API経由）
2.  **Twitch Client ID & Client Secret**
    *   Twitch のライブ配信ステータス確認
    *   Twitch の過去アーカイブ取得
    *   Twitch の配信スケジュール取得
3.  **Google Gemini API Key**
    *   `check` コマンドでの動画要約機能 (`-s` オプション)

```bash
valiv init
```

*   `-C, --clean`: 既存の設定とキャッシュをクリアして初期化します。

### クリエイターの追加

推しの情報を登録します。対話形式のフォームで YouTube チャンネル ID などを入力します。

```bash
valiv add
```

### クリエイターの削除

登録済みのクリエイターを削除します。

```bash
valiv remove
# または
valiv rm
```

### 登録済みクリエイターの一覧

登録したクリエイターの情報を確認します。

```bash
valiv list
# 詳細表示
valiv list --detail
# インタラクティブモード
valiv list --interactive
# キャッシュを無視して強制更新
valiv list --refresh
# クリエイターごとの色分けを無効化
valiv list --no-color-creator
```

*   **Tips**: `init` コマンドで YouTube API Token を設定している場合、チャンネル登録者数も併せて表示されます。

### 最新アクティビティの確認

登録したクリエイターの最新動画や配信状況を一覧表示します。

```bash
valiv check
# 特定のクリエイターのみチェックする場合
valiv check "Creator Name"
# キャッシュを無視して強制更新
valiv check --refresh
# 動画の内容を要約（要 Gemini API Key）
valiv check --summary
# プレイリストを指定して再生
valiv check --playlist /path/to/playlist.csv
# 映像なし（音声のみ）で再生
valiv check --audio-only
# デバッグログを出力
valiv check --debug
```

*   **操作方法**:
    *   `↑` `↓` キーでアクティビティを選択します。
    *   `Enter` キーで選択したアクティビティを開きます。
*   **動画再生**:
    *   システムに `mpv` がインストールされている場合、直接 `mpv` で動画を再生します。
    *   `mpv` が見つからない場合、デフォルトのブラウザで URL を開きます。
    *   `--audio-only` (`-a`) オプションを指定すると、映像なし（音声のみ）で再生します。
        *   音声再生中は `q` キーを押すことで再生を停止し、CLIを終了できます。
    *   `--playlist` (`-p`) オプションで `uta_picker` 形式のプレイリストCSVを指定して再生できます。
*   **AI 要約**:
    *   `--summary` (`-s`) オプションを使用すると、最新の動画の要約を表示します（要 Gemini API Key）。
        *   **注意**: 現在 Twitch のアーカイブやライブ配信の要約には対応していません。オプション指定時は YouTube の動画のみが表示されます。
*   **その他**:
    *   `--debug` (`-d`) オプションを指定すると、`valiv_debug.log` に詳細なログ（yt-dlpの出力含む）を出力します。
    *   `--refresh` (`-r`) オプションを使用すると、キャッシュを無視して最新のデータを取得します。
*   **取得データの制限**:
    *   YouTubeの情報はRSSフィードから取得しているため、直近の15件程度の動画/配信のみが表示されます。
    *   Twitch連携を設定している場合、Twitchのライブ配信と過去のアーカイブも表示されます。
    *   配信予定については `schedule` コマンドのご利用を推奨します（API Token設定時はより正確な情報を取得できます）。

### スケジュールの確認

Google Calendar から取得したスケジュールを表示します。
API設定が有効な場合、以下のソースからも情報を取得・統合します。

*   **YouTube Data API**: 配信予定枠とライブ配信
*   **Twitch API**: 配信スケジュール（Twitch Schedule）とライブ配信

```bash
valiv schedule
# 特定のクリエイターのみチェックする場合
valiv schedule "Creator Name"
# 週間カレンダー表示
valiv schedule --week
# 強制更新
valiv schedule --refresh
```

## 開発

### ビルド

```bash
npm run build
```

### 開発モード (Watch)

```bash
npm run dev
```

### テストの実行

プロジェクトには [Vitest](https://vitest.dev/) を使用したユニットテストが含まれています。
以下のコマンドでテストを実行できます。

#### すべてのテストを実行 (Watch Mode)

デフォルトでは Watch モードで起動し、ファイルの変更を検知してテストを再実行します。

```bash
npm test
```

### コードフォーマット & Lint

```bash
npm run format
npm run lint
```

## ライセンス

[MIT License](LICENSE)

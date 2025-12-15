# valiv

**valiv** は、アイドルマスター vα-liv (ヴイアラ) メンバーの活動をまとめてチェックするための CLI ツールです。
YouTube, X, Google Calendar などの情報を集約し、灯里愛夏、上水流宇宙、レトラの最新情報をターミナルから手軽に確認できます。

## 特徴

*   📺 **Activity Check**: メンバー（灯里愛夏、上水流宇宙、レトラ）の最新動画や配信状況を一覧表示
*   📅 **Schedule**: 公式 Google Calendar からスケジュールを取得して表示

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

```bash
valiv init
```

### クリエイターの追加

推しの情報を登録します。対話形式のフォームで YouTube チャンネル ID などを入力します。

```bash
valiv add
```

### クリエイターの削除

登録済みのクリエイターを削除します。

```bash
valiv remove
```

### 登録済みクリエイターの一覧

登録したクリエイターの情報を確認します。

```bash
valiv list
# 詳細表示
valiv list --detail
# インタラクティブモード
valiv list --interactive

```

### 最新アクティビティの確認

登録したクリエイターの最新動画や配信状況を一覧表示します。

```bash
valiv check
# 特定のクリエイターのみチェックする場合
valiv check "Creator Name"
# キャッシュを無視して強制更新
valiv check --refresh
# プレイリストを指定して再生
valiv check --playlist /path/to/playlist.csv

```

*   **操作方法**:
    *   `↑` `↓` キーでアクティビティを選択します。
    *   `Enter` キーで選択したアクティビティを開きます。
*   **動画再生**:
    *   システムに `mpv` がインストールされている場合、直接 `mpv` で動画を再生します。
    *   `mpv` が見つからない場合、デフォルトのブラウザで URL を開きます。
    *   `--audio-only` (`-a`) オプションを指定すると、映像なし（音声のみ）で再生します。
        *   音声再生中は `q` キーを押すことで再生を停止し、CLIを終了できます。
    *   `--debug` (`-d`) オプションを指定すると、`valiv_debug.log` に詳細なログ（yt-dlpの出力含む）を出力します。
    *   `--refresh` (`-r`) オプションを使用すると、キャッシュを無視して最新のデータを取得します。
    *   `--playlist` (`-p`) オプションでプレイリストCSVを指定して再生できます。
*   **取得データの制限**:
    *   YouTubeの情報はRSSフィードから取得しているため、直近の15件程度の動画/配信のみが表示されます。
    *   配信予定枠などはRSSに含まれない場合があり、表示されないことがあります。
    *   **次回アップデート予定**: 次期開発にて YouTube Data API との連携を行い、これらの制限を解消してより多くのデータを表示できるようにする予定です。

### スケジュールの確認

Google Calendar から取得したスケジュールを表示します。

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

#### UIモードでの実行

ブラウザ上でテスト結果を可視化して確認したい場合は、以下のコマンドを使用します。

```bash
npx vitest --ui
```

#### CIモード (1回のみ実行)

CI環境などで1回だけ実行して終了したい場合は、以下のコマンドを使用します。

```bash
npx vitest run
```

### コードフォーマット & Lint

```bash
npm run format
npm run lint
```

## ライセンス

[MIT License](LICENSE)

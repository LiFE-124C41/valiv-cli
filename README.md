# valiv

**valiv** は、推しの活動をまとめてチェックするための CLI ツールです。
YouTube, Twitch, X, Google Calendar などの情報を集約し、ターミナルから手軽に確認できます。
**TypeScript** と **Ink** を採用し、リッチでインタラクティブな UI を提供します。

## 特徴

*   📺 **YouTube**: 最新動画や配信予定をチェック
*   🎮 **Twitch**: 配信状況を確認
*   🐦 **X**: 最新のポストを確認 (予定)
*   📅 **Calendar**: Google Calendar (iCal) からスケジュールを取得
*   🚀 **Interactive UI**: Ink を使用したモダンな操作感

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
ウェルカム画面が表示され、利用を開始できます。

```bash
valiv init
```

### クリエイターの追加

推しの情報を登録します。対話形式のフォームで YouTube チャンネル ID などを入力します。

```bash
valiv add
```

### 登録済みクリエイターの一覧

登録したクリエイターの情報を確認します。

```bash
valiv list
```

### 最新アクティビティの確認

登録したクリエイターの最新動画や配信状況を一覧表示します。

```bash
valiv check
# 特定のクリエイターのみチェックする場合
valiv check "Creator Name"
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

### スケジュールの確認

Google Calendar から取得したスケジュールを表示します。

```bash
valiv schedule
# 特定のクリエイターのみチェックする場合
valiv schedule "Creator Name"
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

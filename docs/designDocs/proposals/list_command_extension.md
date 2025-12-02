# `list` コマンド拡張提案

現状の `list` コマンドは名前と簡易的なステータス表示のみですが、以下の機能を拡張することを提案します。

## 1. 詳細テーブル表示 (`--detail` / `-v`)
各プラットフォームのIDやURLを含めた詳細な情報を表形式で表示します。

- **表示項目**:
    - 名前
    - YouTube Channel ID
    - Twitch Channel ID
    - X Username
    - Calendar URL (有無)
- **使用イメージ**:
    ```bash
    valiv list --detail
    ```

## 2. インタラクティブモード (`--interactive` / `-i`)
リストを矢印キーで移動し、選択したクリエイターに対してアクションを実行できるメニューを表示します。
デフォルトの挙動にするか、オプションにするかは検討事項です。

- **アクション**:
    - **Check**: 最新の活動を確認 (`valiv check [name]`)
    - **Open**: ブラウザで開く (`valiv open [name] [platform]`)
    - **Remove**: 削除する (`valiv remove`)
- **使用イメージ**:
    ```bash
    valiv list -i
    ```

## 3. フィルタリング機能 (`--filter` / `-f`)
特定のプラットフォームが登録されているクリエイターのみを表示します。

- **引数**: `youtube`, `twitch`, `x`, `calendar`
- **使用イメージ**:
    ```bash
    valiv list --filter twitch
    ```

## 推奨方針
**案1 (詳細表示)** と **案2 (インタラクティブ)** の両方を実装することを推奨します。
これにより、一覧性の向上と操作性の向上を同時に実現できます。

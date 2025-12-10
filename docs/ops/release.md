# リリース運用手順

`valiv-cli` の新しいバージョンをリリースする手順について説明します。
本プロジェクトでは GitHub Actions を使用して、タグのプッシュをトリガーにリリース作業（GitHub Release 作成、NPM 公開）を自動化しています。

## 前提条件

- ローカル環境で `master` (または `main`) ブランチが最新であること。
- **初回のみ**: GitHub リポジトリの Secrets に以下のトークンが設定されていること。
    - `NPM_TOKEN`: npm の Automation Token (Publish権限)。
    - `BOT_TOKEN`: GitHub の Fine-grained Personal Access Token (Contents:Write, Workflows:Write)。
        - ※ GitHub Actions からのタグプッシュで後続のワークフローをトリガーするために必要です。

## リリース手順 (推奨: GitHub Actions)

GitHub Actions を利用して、ブラウザ上から安全にリリースを行う方法です。

1. GitHub リポジトリの **Actions** タブを開きます。
2. 左側のワークフロー一覧から **Bump Version** を選択します。
3. **Run workflow** ドロップダウンをクリックします。
4. **Version level** (patch / minor / major) を選択し、**Run workflow** ボタンを押します。

これだけで、以下の処理が自動的に行われます：
1. バージョンの更新 (`package.json`, `package-lock.json`)
2. Gitタグの作成とプッシュ
3. **Release** ワークフローのトリガー
    - テスト・ビルド
    - GitHub Release 作成
    - npm への公開

## リリース手順 (代替: ローカル実行)

手動でコマンドを実行してリリースを行う方法です。

### 1. ローカルでの事前確認

```bash
npm run lint
npm run test
```

### 2. リリースコマンドの実行

`npm run release` コマンドを使用します（内部で `npm version` が実行されます）。

```bash
# パッチバージョン (0.0.1 -> 0.0.2)
npm run release -- patch

# マイナーバージョン (0.0.1 -> 0.1.0)
npm run release -- minor

# メジャーバージョン (0.0.1 -> 1.0.0)
npm run release -- major
```

このコマンドは以下を自動で行います：
1. バージョン番号の更新
2. git commit の作成
3. git tag の作成

### 3. リモートへのプッシュ

**重要**: タグも一緒にプッシュする必要があります。

```bash
git push origin main --follow-tags
```

タグがプッシュされると、GitHub Actions の **Release** ワークフローが自動的に開始されます。

## リリース後の確認

- [GitHub Releases](https://github.com/LiFE-124C41/valiv-cli/releases) でリリースが作成されているか確認。
- [npm package](https://www.npmjs.com/package/valiv-cli) でバージョンが更新されているか確認。

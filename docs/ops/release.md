# リリース運用手順

`valiv-cli` の新しいバージョンをリリースする手順について説明します。
本プロジェクトでは GitHub Actions を使用して、タグのプッシュをトリガーにリリース作業（GitHub Release 作成、NPM 公開）を自動化しています。

## 前提条件

- ローカル環境で `master` (または `main`) ブランチが最新であること。
- 開発用依存関係がインストールされていること (`npm install`)。
- **初回のみ**: GitHub リポジトリの Secrets に `NPM_TOKEN` が設定されていること。
    - npm のウェブサイトで Automation Token を発行し、GitHub リポジトリ設定 > Secrets and variables > Actions に登録してください。

## リリースフロー

### 1. ローカルでの事前確認

リリース前に、ローカルでテストとLintが通ることを確認することを推奨します。

```bash
npm run lint
npm run test
```

### 2. バージョンの更新とタグ作成

`npm version` コマンドを使用して、`package.json` のバージョン更新と git タグの作成を同時に行います。

```bash
# パッチバージョン (0.0.1 -> 0.0.2)
npm version patch

# マイナーバージョン (0.0.1 -> 0.1.0)
npm version minor

# メジャーバージョン (0.0.1 -> 1.0.0)
npm version major
```

このコマンドは以下の処理を自動で行います：
1. `package.json` と `package-lock.json` のバージョン番号を更新
2. git commit の作成
3. git tag の作成（例: `v0.0.2`）

### 3. リモートへのプッシュ

更新内容とタグをリモートリポジトリへプッシュします。
`--follow-tags` オプションをつけることで、コミットと同時にタグもプッシュされます。

```bash
git push origin main --follow-tags
```

### 4. 自動リリースの確認

タグがプッシュされると、GitHub Actions の `Release` ワークフローが自動的に開始されます。
[Actions タブ](https://github.com/LiFE-124C41/valiv-cli/actions) から進行状況を確認できます。

処理が成功すると：
1. **GitHub Release**: 新しいリリースが作成され、変更履歴（Release Notes）が自動生成されます。
2. **NPM Publish**: パッケージが npm レジストリに公開されます。

### 5. リリース後の確認

- GitHub の Releases ページで内容を確認します。
- npm パッケージページで新しいバージョンが公開されているか確認します。

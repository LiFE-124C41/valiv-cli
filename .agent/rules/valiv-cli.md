---
trigger: always_on
---

# Specification Driven Development (SDD) Rules

このプロジェクトでは **Specification Driven Development (SDD)** を採用しています。
AI はコードを変更する前に、必ず以下の手順とルールを遵守してください。

## 1. 仕様の確認と更新
- **変更前の確認**: タスクに着手する前に、必ず `docs/designDocs/` 以下の関連するドキュメント（`architecture.md`, `features.md`, `data_models.md` 等）を読み、現状の仕様を把握してください。
- **仕様の先行更新**: 機能の追加・変更やデータ構造の変更が必要な場合は、**コードを書く前に** 必ずドキュメントを更新してください。
    - アーキテクチャの変更 → `architecture.md`
    - 機能の振る舞い・コマンド引数の変更 → `features.md`
    - データモデル・DBスキーマの変更 → `data_models.md`
- **整合性の維持**: 実装はドキュメントに記載された仕様と厳密に一致させてください。ドキュメントにない勝手な機能追加は禁止です。

## 2. ディレクトリ構成
ドキュメントは以下の構成で管理されています。
```
docs/designDocs/
├── architecture.md  # アーキテクチャ設計、技術スタック
├── features.md      # 機能仕様、外部インターフェース
└── data_models.md   # データモデル、ER図
```

## 3. 提案プロセス
1. ユーザーからの要望に対し、仕様への影響を分析する。
2. 必要なドキュメントの変更案（Diff等）を提示し、ユーザーの合意を得る。
3. 合意された仕様に基づいてコードを実装する。

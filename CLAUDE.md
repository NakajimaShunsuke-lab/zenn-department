# 編集部 Zenn部門 — Agent Teams

このプロジェクトはZenn技術記事の企画・執筆・レビュー・公開を行うAIエージェントチームです。
各エージェントはスラッシュコマンド（Skill）として実装されており、それぞれの専門領域を担当します。

## プロジェクト構成

```
zenn-repo/
├── articles/          # 記事ファイル（{slug}.md）
├── briefs/            # 企画書（{テーマ名}.md）
├── images/{slug}/     # 画像関連ファイル
└── .templates/        # 記事・企画書テンプレート

context/
├── report/            # 記事作成レポート（未処理）
├── analytics/         # Google Analytics CSVエクスポート（ファイル名: YYYYMMDD-YYYYMMDD.csv）
├── knowledge/         # ナレッジ集（蓄積）
└── old_report/        # /zenn-knowledge で処理済みアーカイブ

scripts/               # 自動化スクリプト（Notion同期等）
CONTRIBUTING_ZENN.md   # 全エージェントが遵守するZenn記事ガイドライン
```

## 共通ルール

### 記事ファイル
- 記事のMarkdown執筆時は `CONTRIBUTING_ZENN.md` のガイドラインを厳格に遵守する
- `published` は初稿時点で必ず `false`、最終承認後に `true` へ変更する
- frontmatterの `topics` は最大5つ、`title` は60文字以内推奨

### ナレッジの活用
- `context/knowledge/` のナレッジファイルは企画・執筆・レビュー時に参照する
- `context/report/` の過去レポートも参照し、改善点を活かす
- ナレッジの作成・更新は `/zenn-knowledge` コマンドで実行する

### レポートとNotion同期
- レポートは `context/report/report_YYYYMMDD_テーマ名.md` の形式で保存する
- レポート作成後は `npm run sync-notion` でNotionに同期する（`.env` 設定済みの場合）
- `npm run sync-notion:update` でアナリティクスデータを含めたNotion更新が可能
- `context/report/` 内のレポートは整理のため削除されることがあるが、Notionのデータは削除しない

### コミット規約
- 記事公開時のコミットメッセージ: `feat(article): {記事タイトルの要約}`

## ワークフロー

```
企画 → 執筆 → レビュー → 画像 → 公開チェック → レポート → デプロイ
```

各フェーズのスラッシュコマンドで実行する:

1. `/zenn-director` — 企画・リサーチ・構成案作成
2. `/zenn-write` — Markdown執筆・サンプルコード作成
3. `/zenn-review` — レビュー・校正
4. `/zenn-visual` — 画像生成プロンプト・図解作成
5. `/zenn-ops` — 公開前チェック・公開
6. `/zenn-report` — 記事作成レポート作成
7. `/zenn-knowledge` — レポート＋アナリティクスからナレッジを作成・更新

全フェーズを一括実行する場合は `/zenn-full` を使用する（各フェーズ完了時にユーザー確認あり）。

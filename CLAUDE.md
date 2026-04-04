# 編集部 Zenn部門 — Agent Teams

このプロジェクトはZenn技術記事の企画・執筆・レビュー・公開を行うAIエージェントチームです。

## プロジェクト構成

- `zenn-repo/` — Zenn CLIで管理される記事リポジトリ（articles, briefs, images）
- `context/report/` — 記事作成レポートの蓄積ディレクトリ（未処理）
- `context/analytics/` — Google Analyticsエクスポート（CSVファイル、未処理）
- `context/knowledge/` — レポート＋アナリティクスから抽出したナレッジ集
- `context/old_report/` — `/zenn-knowledge` で処理済みのレポート・アナリティクスのアーカイブ
- `scripts/` — 自動化スクリプト（Notion同期など）
- `CONTRIBUTING_ZENN.md` — 全エージェントが遵守するZenn記事ガイドライン

## 共通ルール

- 記事のMarkdown執筆時は必ず `CONTRIBUTING_ZENN.md` のガイドラインに従うこと
- 記事ファイルは `zenn-repo/articles/` に配置する
- 企画書は `zenn-repo/briefs/` に配置する
- 画像関連ファイルは `zenn-repo/images/{slug}/` に配置する
- テンプレートは `zenn-repo/.templates/` を参照する
- レポートは `context/report/` ディレクトリに `report_YYYYMMDD_テーマ名.md` の形式で保存する
- `context/report/` に蓄積されたレポートは記事作成時にナレッジとして参照すること
- レポート作成後は `npm run sync-notion` でNotionデータベースに同期すること（`.env` 設定済みの場合）
- `context/report/` 内のレポートは整理のため削除されることがあるが、Notionのデータは削除しない
- `context/knowledge/` のナレッジファイルは記事の企画・執筆・レビュー時に参照すること
- `context/analytics/` にはGoogle AnalyticsのCSVエクスポートを配置する（ファイル名は計測期間: `YYYYMMDD-YYYYMMDD.csv`）
- ナレッジの作成・更新は `/zenn-knowledge` コマンドで実行する
- `npm run sync-notion:update` でアナリティクスデータを含めたNotion更新が可能
- 記事の `published` は初稿時点では必ず `false` にし、最終承認後に `true` へ変更する

## ワークフロー

各フェーズのスラッシュコマンドで実行する:

1. `/zenn-director` — 企画・リサーチ・構成案作成
2. `/zenn-write` — Markdown執筆・サンプルコード作成
3. `/zenn-review` — レビュー・校正
4. `/zenn-visual` — 画像生成プロンプト・図解作成
5. `/zenn-ops` — 公開前チェック・公開
6. `/zenn-report` — 記事作成レポート作成

全フェーズを一括実行する場合は `/zenn-full` を使用する（各フェーズ完了時にユーザー確認あり）。

### ナレッジ管理

- `/zenn-knowledge` — レポート＋アナリティクスからナレッジを作成・更新

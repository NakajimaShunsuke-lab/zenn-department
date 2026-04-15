# 編集部 Zenn部門 — Agent Teams

このプロジェクトはZenn技術記事の企画・執筆・レビュー・公開を行うAIエージェントチームです。
各エージェントはスラッシュコマンド（Skill）として実装されており、それぞれの専門領域を担当します。

## ディレクトリの役割
- `briefs/` — 企画書
- `context/report/` — 未処理の記事作成レポート
- `context/old_report/` — `/zenn-knowledge` で処理済みのアーカイブ
- `context/analytics/` — Google Analytics CSVエクスポート（ファイル名: YYYYMMDD-YYYYMMDD.csv）
- `context/knowledge/` — ナレッジ集（蓄積）

## 編集方針
- 対象読者（初心者 or 中級者以上）は企画時にユーザーへ確認する
- 中級者以上向け：技術的厳密さを優先、敬体（ですます調）で書く
- 初心者向け：わかりやすさを優先、常体（である調）で書く

## slug命名規則
- 英語・ハイフン区切り（例: `context-engineering-guide`）
- 初心者向けは `{技術}-basics-for-beginners` の形式
- slugはZennの永続URLになるため変更不可、企画時に確定させる

## 共通ルール
- 記事のMarkdown執筆時は `.claude/templates/CONTRIBUTING_ZENN.md` のガイドラインを厳格に遵守する
- `context/knowledge/` と `context/report/` は企画・執筆・レビュー時に参照する

### レポートとNotion同期
- レポートは `context/report/report_YYYYMMDD_テーマ名.md` の形式で保存する
- レポート作成後は `npm run sync-notion` でNotionに同期する（`.env` 設定済みの場合）
- `npm run sync-notion:update` でアナリティクスデータを含めたNotion更新が可能
- `context/report/` 内のレポートは整理のため削除されることがあるが、Notionのデータは削除しない

## ワークフロー
企画 → 執筆 → レビュー → 画像 → 公開チェック → レポート → デプロイ

---
description: レポート作成・ナレッジ管理に関するルール。context/配下のファイル操作時に適用する。
paths: ["context/**/*.md", "context/**/*.csv"]
---

# レポート・ナレッジ管理ルール

## レポート
- ファイル名: `context/report/report_YYYYMMDD_テーマ名.md`
- レポート作成後は `npm run sync-notion` でNotionに同期する
- `.env` に `NOTION_TOKEN` と `NOTION_DATABASE_ID` が未設定の場合はスキップしてユーザーに通知

## ナレッジ
- ナレッジファイルの作成・更新は `/zenn-knowledge` コマンドで実行する
- ナレッジファイルは `context/knowledge/` に蓄積し続ける（削除しない）
- 各ファイル冒頭に `最終更新: YYYY-MM-DD（対象レポート: N件）` を記載する

### ナレッジファイル一覧
| ファイル | 内容 |
|---------|------|
| `writing-patterns.md` | 記事構成パターン、分量目安、差別化戦略 |
| `review-lessons.md` | レビュー指摘パターン、追加チェック項目 |
| `analytics-insights.md` | PV傾向、カテゴリ別パフォーマンス |
| `production-tips.md` | OGP画像、Mermaid記法、Zenn記法の技術Tips |

## アーカイブ
- 処理済みレポート・アナリティクスは `context/old_report/YYYY-MM-DD/` に移動する
- ディレクトリ名はコマンド実行日
- 同名ファイルが存在する場合は上書きしない

## アナリティクス
- CSVファイルは `context/analytics/` に配置する
- ファイル名は計測期間: `YYYYMMDD-YYYYMMDD.csv`
- ナレッジ更新時は `npm run sync-notion:update` でNotionにも反映する

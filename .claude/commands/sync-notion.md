# Notion同期 — contextレポートをNotionデータベースに登録

context/report/ ディレクトリ内のレポートファイルをNotionデータベースに同期します。
新規レポートのみ追加し、Notion側のデータは削除しません。

## 実行手順

1. **環境変数の確認:** `.env` ファイルに `NOTION_TOKEN` と `NOTION_DATABASE_ID` が設定されているか確認する。未設定の場合はユーザーに通知して終了する
2. **同期実行:** 以下のコマンドを実行する
   ```bash
   npm run sync-notion
   ```
3. **結果報告:** 同期結果（新規登録件数・スキップ件数・エラー）をユーザーに報告する

$ARGUMENTS

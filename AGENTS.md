# AGENTS.md — Zenn編集部 AIエージェントチーム

このプロジェクトはZenn技術記事の企画・執筆・レビュー・公開を行うAIエージェントチームです。
各エージェントはスラッシュコマンド（Skill）として実装されており、それぞれの専門領域を担当します。

## エージェント一覧

| エージェント | コマンド | 役割 |
|---|---|---|
| リサーチャーAI | `/zenn-director` | 企画・情報収集・構成案作成 |
| ライターAI | `/zenn-write` | Markdown執筆・サンプルコード作成 |
| レビュアー・校正AI | `/zenn-review` | 品質管理・テクニカルチェック |
| 画像生成プロンプトAI | `/zenn-visual` | アイキャッチ・図解用プロンプト作成 |
| 公開オペレーション | `/zenn-ops` | 公開前チェック・published切り替え |
| レポートAI | `/zenn-report` | 記事作成レポートの作成 |
| ナレッジAI | `/zenn-knowledge` | レポート＋アナリティクスからナレッジ管理 |
| 統括エージェント | `/zenn-full` | 全フェーズ一括実行 |

## ワークフロー

```
企画 → 執筆 → レビュー → 画像 → 公開チェック → レポート → デプロイ
```

各フェーズ完了時にユーザー（統括ディレクター）の確認・承認を得てから次へ進む。

## ディレクトリ構成

```
zenn-repo/
├── articles/          # 記事ファイル（{slug}.md）
├── briefs/            # 企画書（{テーマ名}.md）
├── images/{slug}/     # 画像関連ファイル
└── .templates/        # 記事・企画書テンプレート

context/
├── report/            # 記事作成レポート（未処理）
├── analytics/         # Google Analytics CSVエクスポート
├── knowledge/         # ナレッジ集（蓄積）
└── old_report/        # 処理済みアーカイブ

scripts/               # 自動化スクリプト（Notion同期等）
```

## 共通ルール

### 記事ファイル
- 記事のMarkdown執筆時は `CONTRIBUTING_ZENN.md` のガイドラインを厳格に遵守する
- `published` は初稿時点で必ず `false`、最終承認後に `true` へ変更する
- frontmatterの `topics` は最大5つ、`title` は60文字以内推奨

### ナレッジの活用
- `context/knowledge/` のナレッジファイルは企画・執筆・レビュー時に参照する
- `context/report/` の過去レポートも参照し、改善点を活かす

### レポートとNotion同期
- レポートは `context/report/report_YYYYMMDD_テーマ名.md` の形式で保存する
- レポート作成後は `npm run sync-notion` でNotionに同期する
- ナレッジ更新時は `npm run sync-notion:update` でアナリティクスデータも反映する

### コミット規約
- 記事公開時のコミットメッセージ: `feat(article): {記事タイトルの要約}`

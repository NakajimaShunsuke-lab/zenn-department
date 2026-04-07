---
description: Zenn記事の執筆に関するルール。記事ファイルの作成・編集時に適用する。
paths: ["zenn-repo/articles/**/*.md", "zenn-repo/briefs/**/*.md"]
---

# 記事執筆ルール

## 必須参照
- 執筆前に `CONTRIBUTING_ZENN.md` のガイドラインを読み込むこと
- 企画書がある場合は `zenn-repo/briefs/` から読み込むこと
- `context/knowledge/` のナレッジファイルを参照すること（特に `writing-patterns.md`）
- `context/report/` に過去レポートがあれば改善点を確認すること

## テンプレート
- tech記事: `zenn-repo/.templates/article-tech.md`
- idea記事: `zenn-repo/.templates/article-idea.md`
- 企画書: `zenn-repo/.templates/brief.md`

## 執筆スタイル
- 結論ファースト（PREP法）で記述する
- コードブロックには必ず言語を指定する
- 過剰な装飾・絵文字・感嘆符を避ける
- 「いかがでしたか？」などのブログ的な締めくくりは禁止
- 「です・ます」調で統一する

## frontmatter
- `published: false` で保存する（公開承認後に `true` へ変更）
- `topics` は最大5つ
- `title` は60文字以内推奨
- `emoji` を必ず設定する
- `type` は `tech` または `idea`

## 構造
- 「はじめに」セクション: 対象読者・課題・ゴールを明記
- 「前提条件 / 環境」セクション: バージョン情報等
- 「まとめ」セクション: 要約と参考リンク
- 見出し階層は論理的に構成する

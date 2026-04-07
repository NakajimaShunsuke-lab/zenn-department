# Google Analytics 自動取得 セットアップ手順

毎週日曜日にGA4のアナリティクスデータを自動取得し、`context/analytics/` にCSVとして保存する仕組みのセットアップ手順です。

---

## 1. Google Cloud プロジェクトの準備

### 1-1. プロジェクト作成（既存があればスキップ）

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 左上のプロジェクトセレクタ → 「新しいプロジェクト」
3. プロジェクト名を入力（例: `zenn-analytics`）して作成

### 1-2. GA4 Data API を有効化

1. Google Cloud Console → 「APIとサービス」→「ライブラリ」
2. **「Google Analytics Data API」** を検索
3. 「有効にする」をクリック

### 1-3. サービスアカウントの作成

1. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」
2. サービスアカウント名を入力（例: `ga-reader`）
3. 作成後、そのサービスアカウントの詳細ページへ
4. 「キー」タブ →「鍵を追加」→「新しい鍵を作成」→ **JSON** を選択
5. JSONファイルがダウンロードされるので安全に保管

---

## 2. GA4 プロパティにアクセス権を付与

1. [Google Analytics](https://analytics.google.com/) にアクセス
2. 管理 → 対象のプロパティ → 「プロパティのアクセス管理」
3. 「＋」→「ユーザーを追加」
4. サービスアカウントのメールアドレス（例: `ga-reader@zenn-analytics.iam.gserviceaccount.com`）を入力
5. 権限: **「閲覧者」** を選択して追加

---

## 3. GA4 プロパティIDの確認

1. Google Analytics → 管理 → プロパティ設定
2. 「プロパティID」（数字のみ、例: `123456789`）をメモ

---

## 4. ローカルでのテスト

### 4-1. 環境変数の設定

`.env` に以下を追加:

```
GA_PROPERTY_ID=123456789
GOOGLE_APPLICATION_CREDENTIALS=./credentials/ga-service-account.json
```

サービスアカウントのJSONキーファイルを `credentials/` ディレクトリに配置してください。  
（`credentials/` は `.gitignore` に追加することを推奨）

### 4-2. 依存パッケージのインストール

```bash
npm install
```

### 4-3. 実行テスト

```bash
# 直近7日間のデータを取得
npm run fetch-analytics

# 期間を指定して取得
node scripts/fetch-ga-analytics.mjs --start 20260401 --end 20260407
```

`context/analytics/YYYYMMDD-YYYYMMDD.csv` が生成されれば成功です。

---

## 5. GitHub Actions の設定

### 5-1. GitHub Secrets に登録

リポジトリの Settings → Secrets and variables → Actions → 「New repository secret」

| Secret名 | 値 |
|---|---|
| `GA_PROPERTY_ID` | GA4プロパティID（数字のみ） |
| `GOOGLE_CREDENTIALS_JSON` | サービスアカウントJSONキーをBase64エンコードした文字列 |

**Base64エンコード方法:**

```bash
# macOS / Linux
base64 -i credentials/ga-service-account.json | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("credentials\ga-service-account.json"))
```

出力された文字列を `GOOGLE_CREDENTIALS_JSON` の値として登録します。

### 5-2. 動作確認

1. リポジトリの Actions タブを開く
2. 「Weekly GA Analytics Fetch」ワークフローを選択
3. 「Run workflow」で手動実行
4. 正常完了後、`context/analytics/` に新しいCSVがコミットされていることを確認

---

## スケジュール

- **実行タイミング**: 毎週日曜日 09:00 JST（UTC 00:00）
- **取得期間**: 直近7日間（月曜〜日曜）
- **出力先**: `context/analytics/YYYYMMDD-YYYYMMDD.csv`
- **自動コミット**: データがある場合のみ自動でcommit & push

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `PERMISSION_DENIED` | GA4プロパティにサービスアカウントの閲覧権限があるか確認 |
| `GA_PROPERTY_ID が設定されていません` | `.env` またはGitHub Secretsを確認 |
| `API has not been enabled` | Google Cloud ConsoleでGA4 Data APIを有効化 |
| CSVが空 | 指定期間にデータがない可能性。期間を広げてテスト |
| Actions で push 失敗 | ワークフローの `permissions: contents: write` を確認 |

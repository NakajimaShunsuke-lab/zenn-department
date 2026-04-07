/**
 * Google Analytics 4 Data API からアナリティクスデータを取得し、
 * context/analytics/ にCSVとして保存するスクリプト
 *
 * 使い方:
 *   node scripts/fetch-ga-analytics.mjs              # 直近7日間（デフォルト）
 *   node scripts/fetch-ga-analytics.mjs --days 14    # 直近14日間
 *   node scripts/fetch-ga-analytics.mjs --start 20260401 --end 20260407  # 期間指定
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// ---------------------------------------------------------------------------
// 設定
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const ANALYTICS_DIR = join(PROJECT_ROOT, "context", "analytics");

config({ path: join(PROJECT_ROOT, ".env") });

const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID;
const GOOGLE_CREDENTIALS_JSON = process.env.GOOGLE_CREDENTIALS_JSON; // Base64 or JSON string

if (!GA_PROPERTY_ID) {
  console.error("エラー: GA_PROPERTY_ID が .env に設定されていません。");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 認証クライアントの作成
// ---------------------------------------------------------------------------

function createClient() {
  // 方法1: GOOGLE_CREDENTIALS_JSON 環境変数（GitHub Actions向け）
  if (GOOGLE_CREDENTIALS_JSON) {
    console.log("認証方法: GOOGLE_CREDENTIALS_JSON 環境変数を使用");
    let credentials;
    try {
      // Base64エンコードされている場合
      credentials = JSON.parse(
        Buffer.from(GOOGLE_CREDENTIALS_JSON, "base64").toString("utf-8")
      );
      console.log("  Base64デコード成功");
    } catch {
      // プレーンJSON文字列の場合
      credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON);
      console.log("  プレーンJSONとしてパース");
    }
    if (!credentials.client_email || !credentials.private_key) {
      console.error("エラー: credentials に client_email または private_key が含まれていません。");
      console.error("  含まれるキー:", Object.keys(credentials).join(", "));
      process.exit(1);
    }
    console.log(`  サービスアカウント: ${credentials.client_email}`);
    return new BetaAnalyticsDataClient({ credentials });
  }

  // 方法2: GOOGLE_APPLICATION_CREDENTIALS 環境変数（ローカル向け）
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = join(PROJECT_ROOT, process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log(`認証方法: GOOGLE_APPLICATION_CREDENTIALS ファイルを使用 (${credPath})`);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    return new BetaAnalyticsDataClient();
  }

  console.error("エラー: 認証情報が見つかりません。");
  console.error("  以下のいずれかを設定してください:");
  console.error("  - GOOGLE_CREDENTIALS_JSON 環境変数（Base64またはJSON文字列）");
  console.error("  - GOOGLE_APPLICATION_CREDENTIALS 環境変数（キーファイルパス）");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 日付ユーティリティ
// ---------------------------------------------------------------------------

/** Date → "YYYYMMDD" */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Date → "YYYY-MM-DD" (GA4 API用) */
function formatDateAPI(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// CLI引数パース
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  let days = 7;
  let startDate = null;
  let endDate = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days" && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--start" && args[i + 1]) {
      startDate = args[i + 1];
      i++;
    } else if (args[i] === "--end" && args[i + 1]) {
      endDate = args[i + 1];
      i++;
    }
  }

  if (startDate && endDate) {
    return { startDate, endDate };
  }

  // デフォルト: 直近N日間（昨日まで）
  const end = new Date();
  end.setDate(end.getDate() - 1); // 昨日
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

// ---------------------------------------------------------------------------
// GA4 Data API 呼び出し
// ---------------------------------------------------------------------------

async function fetchAnalyticsData(client, startDate, endDate) {
  // YYYYMMDD → YYYY-MM-DD に変換（API用）
  const startAPI = startDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
  const endAPI = endDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

  console.log(`GA4 Data API からデータを取得中...`);
  console.log(`  プロパティ: ${GA_PROPERTY_ID}`);
  console.log(`  期間: ${startDate} - ${endDate}`);

  const [response] = await client.runReport({
    property: `properties/${GA_PROPERTY_ID}`,
    dateRanges: [{ startDate: startAPI, endDate: endAPI }],
    dimensions: [{ name: "pageTitle" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "activeUsers" },
      { name: "screenPageViewsPerUser" },
      { name: "userEngagementDuration" },
      { name: "eventCount" },
      { name: "conversions" },
      { name: "totalRevenue" },
    ],
    orderBys: [
      { metric: { metricName: "screenPageViews" }, desc: true },
    ],
    limit: 500,
  });

  return response;
}

// ---------------------------------------------------------------------------
// GA4レスポンス → CSV変換（既存フォーマット互換）
// ---------------------------------------------------------------------------

function convertToCSV(response, startDate, endDate) {
  const lines = [];

  // ヘッダーコメント（GA手動エクスポートと同じ形式）
  lines.push("# ----------------------------------------");
  lines.push("# ページとスクリーン: ページ タイトルとスクリーン クラス");
  lines.push("# アカウント: NAKAJI");
  lines.push("# プロパティ: Zenn");
  lines.push("# ----------------------------------------");
  lines.push("# ");
  lines.push("# すべてのユーザー");
  lines.push(`# 開始日: ${startDate}`);
  lines.push(`# 終了日: ${endDate}`);

  // カラムヘッダー
  lines.push(
    "ページ タイトルとスクリーン クラス,表示回数,アクティブ ユーザー,アクティブ ユーザーあたりのビュー,アクティブ ユーザーあたりの平均エンゲージメント時間,イベント数,キーイベント,合計収益"
  );

  // データ行
  if (response.rows) {
    for (const row of response.rows) {
      const pageTitle = row.dimensionValues[0].value;
      const views = parseInt(row.metricValues[0].value, 10);
      const users = parseInt(row.metricValues[1].value, 10);
      const viewsPerUser = parseFloat(row.metricValues[2].value);
      const totalEngagement = parseFloat(row.metricValues[3].value);
      const events = parseInt(row.metricValues[4].value, 10);
      const conversions = parseInt(row.metricValues[5].value, 10);
      const revenue = parseInt(row.metricValues[6].value, 10);

      // アクティブユーザーあたりの平均エンゲージメント時間を計算
      const engagementPerUser = users > 0 ? totalEngagement / users : 0;

      // タイトルにカンマが含まれる場合はダブルクォートで囲む
      const escapedTitle = pageTitle.includes(",")
        ? `"${pageTitle.replace(/"/g, '""')}"`
        : pageTitle;

      lines.push(
        `${escapedTitle},${views},${users},${viewsPerUser},${engagementPerUser},${events},${conversions},${revenue}`
      );
    }
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------

async function main() {
  const { startDate, endDate } = parseArgs();

  const client = createClient();
  const response = await fetchAnalyticsData(client, startDate, endDate);

  const rowCount = response.rows?.length ?? 0;
  console.log(`  取得件数: ${rowCount}件`);

  if (rowCount === 0) {
    console.log("データがありません。CSVは生成しません。");
    return;
  }

  const csv = convertToCSV(response, startDate, endDate);

  // 出力ディレクトリ作成
  await mkdir(ANALYTICS_DIR, { recursive: true });

  // ファイル名: YYYYMMDD-YYYYMMDD.csv
  const filename = `${startDate}-${endDate}.csv`;
  const filepath = join(ANALYTICS_DIR, filename);

  await writeFile(filepath, csv, "utf-8");
  console.log(`\n✓ CSVを保存しました: context/analytics/${filename}`);
}

main().catch((err) => {
  console.error("エラーが発生しました:", err.message);
  process.exit(1);
});

/**
 * context/ ディレクトリ内のレポートをNotionデータベースに同期するスクリプト
 *
 * - 新規レポートのみ追加（既にNotionに登録済みのファイルはスキップ）
 * - Notionのデータは削除しない（contextから削除されてもNotion側は残る）
 *
 * 環境変数:
 *   NOTION_TOKEN       - Notion Internal Integration Token
 *   NOTION_DATABASE_ID  - 同期先のNotionデータベースID
 */

import { Client } from "@notionhq/client";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const CONTEXT_DIR = resolve(import.meta.dirname, "..", "context");

// ---------------------------------------------------------------------------
// 環境変数チェック
// ---------------------------------------------------------------------------
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
  console.error(
    "Error: NOTION_TOKEN と NOTION_DATABASE_ID を環境変数に設定してください。"
  );
  console.error("例: NOTION_TOKEN=ntn_xxx NOTION_DATABASE_ID=xxx npm run sync-notion");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// ---------------------------------------------------------------------------
// 初回セットアップ: 不足プロパティをNotionデータベースに追加/リネームする
// ---------------------------------------------------------------------------
async function ensureDatabaseProperties() {
  const db = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
  const names = Object.keys(db.properties);
  const updates = {};

  // 「テキスト」→「ファイル名」にリネーム（プロパティIDで参照）
  if (names.includes("テキスト") && !names.includes("ファイル名")) {
    updates.テキスト = { name: "ファイル名", rich_text: {} };
    console.log("  プロパティリネーム: テキスト → ファイル名");
  }
  // 「マルチセレクト」→「トピック」にリネーム
  if (names.includes("マルチセレクト") && !names.includes("トピック")) {
    updates.マルチセレクト = { name: "トピック", multi_select: {} };
    console.log("  プロパティリネーム: マルチセレクト → トピック");
  }
  // 存在しない場合は新規作成
  if (!names.includes("ファイル名") && !names.includes("テキスト")) {
    updates.ファイル名 = { rich_text: {} };
    console.log("  プロパティ追加: ファイル名");
  }
  if (!names.includes("トピック") && !names.includes("マルチセレクト")) {
    updates.トピック = { multi_select: {} };
    console.log("  プロパティ追加: トピック");
  }

  if (Object.keys(updates).length > 0) {
    await notion.databases.update({
      database_id: NOTION_DATABASE_ID,
      properties: updates,
    });
  }
}

// ---------------------------------------------------------------------------
// Markdownパーサー
// ---------------------------------------------------------------------------

/**
 * レポートMarkdownのフロントセクション（基本情報テーブル）をパースする
 */
function parseBasicInfo(markdown) {
  const info = {};
  const basicSection = markdown.match(/## 基本情報\s*\n([\s\S]*?)(?=\n## )/);
  if (!basicSection) return info;

  const rows = basicSection[1].matchAll(/\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g);
  for (const row of rows) {
    const key = row[1].trim();
    const value = row[2].trim();
    if (key === "---" || key === "項目") continue;
    info[key] = value;
  }
  return info;
}

/**
 * レポートMarkdownの統計情報テーブルをパースする
 */
function parseStats(markdown) {
  const stats = {};
  const statsSection = markdown.match(/## 統計情報\s*\n([\s\S]*?)(?=\n## |$)/);
  if (!statsSection) return stats;

  const rows = statsSection[1].matchAll(/\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g);
  for (const row of rows) {
    const key = row[1].trim();
    const value = row[2].trim();
    if (key === "---" || key === "項目") continue;
    stats[key] = value;
  }
  return stats;
}

/**
 * Markdownテキストの各セクション（## 見出し）を分割して返す
 */
function parseSections(markdown) {
  const sections = [];
  const sectionRegex = /^## (.+)$/gm;
  let match;
  const positions = [];

  while ((match = sectionRegex.exec(markdown)) !== null) {
    positions.push({ title: match[1], start: match.index + match[0].length });
  }

  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start - positions[i + 1].title.length - 4 : markdown.length;
    const content = markdown.slice(positions[i].start, end).trim();
    sections.push({ title: positions[i].title, content });
  }

  return sections;
}

/**
 * レポートのタイトル（# 見出し）を取得する
 */
function parseTitle(markdown) {
  const match = markdown.match(/^# (.+)$/m);
  return match ? match[1].replace(/^記事作成レポート:\s*/, "") : "無題";
}

// ---------------------------------------------------------------------------
// Notion ブロック変換
// ---------------------------------------------------------------------------

/**
 * Markdownのインライン書式を Notion rich_text 配列に変換する
 * 対応: **bold**, `code`
 */
function parseInlineFormatting(text) {
  const richText = [];
  // **bold** と `code` を交互にパース
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // マッチ前のプレーンテキスト
    if (match.index > lastIndex) {
      richText.push({
        type: "text",
        text: { content: text.slice(lastIndex, match.index) },
      });
    }
    if (match[2] !== undefined) {
      // **bold**
      richText.push({
        type: "text",
        text: { content: match[2] },
        annotations: { bold: true },
      });
    } else if (match[3] !== undefined) {
      // `code`
      richText.push({
        type: "text",
        text: { content: match[3] },
        annotations: { code: true },
      });
    }
    lastIndex = match.index + match[0].length;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    richText.push({
      type: "text",
      text: { content: text.slice(lastIndex) },
    });
  }

  return richText.length > 0 ? richText : [{ type: "text", text: { content: text } }];
}

/**
 * テーブル行の配列を Notion table ブロックに変換する
 */
function tableRowsToBlock(rows) {
  // セパレータ行（|---|---|）を除去
  const dataRows = rows.filter((r) => !/^\|[\s-:|]+\|$/.test(r));
  if (dataRows.length === 0) return [];

  const parsedRows = dataRows.map((row) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
  );

  const colCount = parsedRows[0]?.length || 1;

  const tableChildren = parsedRows.map((cells, idx) => ({
    object: "block",
    type: "table_row",
    table_row: {
      cells: cells.map((cell) => parseInlineFormatting(cell)),
    },
  }));

  return [
    {
      object: "block",
      type: "table",
      table: {
        table_width: colCount,
        has_column_header: true,
        has_row_header: false,
        children: tableChildren,
      },
    },
  ];
}

/**
 * Markdownテキストを Notion ブロック配列に変換する
 * 対応: テーブル, ###見出し, リスト項目, 段落（インライン書式付き）
 */
function markdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split("\n");
  let buffer = [];
  let tableBuffer = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n");
    for (let i = 0; i < text.length; i += 1900) {
      const chunk = text.slice(i, i + 1900);
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: parseInlineFormatting(chunk) },
      });
    }
    buffer = [];
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    blocks.push(...tableRowsToBlock(tableBuffer));
    tableBuffer = [];
  };

  for (const line of lines) {
    const isTableLine = /^\|.+\|$/.test(line.trim());

    if (isTableLine) {
      flushBuffer();
      tableBuffer.push(line.trim());
      continue;
    }

    // テーブルが途切れたらフラッシュ
    if (tableBuffer.length > 0) {
      flushTable();
    }

    if (line.startsWith("### ")) {
      flushBuffer();
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: parseInlineFormatting(line.replace(/^### /, "")),
        },
      });
    } else if (line.startsWith("- ")) {
      flushBuffer();
      const itemText = line.replace(/^- /, "");
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: parseInlineFormatting(itemText) },
      });
    } else if (line.trim() === "") {
      flushBuffer();
    } else {
      buffer.push(line);
    }
  }
  flushBuffer();
  flushTable();

  return blocks;
}

// ---------------------------------------------------------------------------
// Notion 操作
// ---------------------------------------------------------------------------

/**
 * Notionデータベースに既に登録済みのファイル名→ページIDマップを取得する
 */
async function getExistingPages() {
  const pages = new Map(); // fileName -> pageId
  let cursor;

  do {
    const response = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
      filter: {
        property: "ファイル名",
        rich_text: { is_not_empty: true },
      },
    });

    for (const page of response.results) {
      const prop = page.properties["ファイル名"];
      if (prop?.rich_text?.[0]?.plain_text) {
        pages.set(prop.rich_text[0].plain_text, page.id);
      }
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return pages;
}

/**
 * 既存ページの本文ブロックをすべて削除する
 */
async function deletePageBlocks(pageId) {
  const response = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });
  for (const block of response.results) {
    await notion.blocks.delete({ block_id: block.id });
  }
}

/**
 * 既存ページのプロパティと本文を更新する
 */
async function updateNotionPage(pageId, fileName, markdown) {
  const title = parseTitle(markdown);
  const info = parseBasicInfo(markdown);
  const stats = parseStats(markdown);
  const sections = parseSections(markdown);

  const topics = (info["トピック"] || "")
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const properties = {
    タイトル: {
      title: [{ type: "text", text: { content: title } }],
    },
    ファイル名: {
      rich_text: [{ type: "text", text: { content: fileName } }],
    },
    テーマ: {
      rich_text: [{ type: "text", text: { content: info["テーマ"] || "" } }],
    },
    スラッグ: {
      rich_text: [{ type: "text", text: { content: info["スラッグ"] || "" } }],
    },
    カテゴリ: {
      select: info["カテゴリ"] ? { name: info["カテゴリ"] } : null,
    },
    トピック: { multi_select: topics },
    ステータス: {
      select: info["ステータス"] ? { name: info["ステータス"] } : null,
    },
    作成日: {
      date: info["作成日"] ? { start: info["作成日"] } : null,
    },
    総文字数: {
      rich_text: [{ type: "text", text: { content: stats["総文字数（Markdown含む）"] || "" } }],
    },
    セクション数: {
      rich_text: [{ type: "text", text: { content: stats["セクション数（##以上）"] || "" } }],
    },
    コードブロック数: {
      rich_text: [{ type: "text", text: { content: stats["コードブロック数"] || "" } }],
    },
  };

  // プロパティ更新
  await notion.pages.update({ page_id: pageId, properties });

  // 既存ブロックを削除
  await deletePageBlocks(pageId);

  // 新しいブロックを追加
  const children = [];
  for (const section of sections) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: section.title } }],
      },
    });
    children.push(...markdownToBlocks(section.content));
  }

  for (let i = 0; i < children.length; i += 100) {
    const batch = children.slice(i, i + 100);
    await notion.blocks.children.append({ block_id: pageId, children: batch });
  }
}

/**
 * レポートをNotionページとして作成する
 */
async function createNotionPage(fileName, markdown) {
  const title = parseTitle(markdown);
  const info = parseBasicInfo(markdown);
  const stats = parseStats(markdown);
  const sections = parseSections(markdown);

  // トピックをmulti_selectに変換
  const topics = (info["トピック"] || "")
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  // プロパティ
  const properties = {
    タイトル: {
      title: [{ type: "text", text: { content: title } }],
    },
    ファイル名: {
      rich_text: [{ type: "text", text: { content: fileName } }],
    },
    テーマ: {
      rich_text: [
        { type: "text", text: { content: info["テーマ"] || "" } },
      ],
    },
    スラッグ: {
      rich_text: [
        { type: "text", text: { content: info["スラッグ"] || "" } },
      ],
    },
    カテゴリ: {
      select: info["カテゴリ"] ? { name: info["カテゴリ"] } : null,
    },
    トピック: {
      multi_select: topics,
    },
    ステータス: {
      select: info["ステータス"] ? { name: info["ステータス"] } : null,
    },
    作成日: {
      date: info["作成日"] ? { start: info["作成日"] } : null,
    },
    総文字数: {
      rich_text: [
        {
          type: "text",
          text: { content: stats["総文字数（Markdown含む）"] || "" },
        },
      ],
    },
    セクション数: {
      rich_text: [
        {
          type: "text",
          text: { content: stats["セクション数（##以上）"] || "" },
        },
      ],
    },
    コードブロック数: {
      rich_text: [
        { type: "text", text: { content: stats["コードブロック数"] || "" } },
      ],
    },
  };

  // ページ本文（各セクションをheading_2 + 本文ブロックに変換）
  const children = [];
  for (const section of sections) {
    children.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: section.title } }],
      },
    });
    children.push(...markdownToBlocks(section.content));
  }

  // Notion API は1回のリクエストで最大100ブロックまで
  const firstBatch = children.slice(0, 100);
  const remaining = children.slice(100);

  const page = await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    properties,
    children: firstBatch,
  });

  // 100ブロックを超える場合は追加リクエストで追記
  for (let i = 0; i < remaining.length; i += 100) {
    const batch = remaining.slice(i, i + 100);
    await notion.blocks.children.append({
      block_id: page.id,
      children: batch,
    });
  }

  return page;
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------

async function main() {
  const isUpdate = process.argv.includes("--update");
  console.log(`=== Notion同期開始${isUpdate ? "（更新モード）" : ""} ===`);

  // データベースのプロパティを確認・更新
  await ensureDatabaseProperties();

  console.log(`対象ディレクトリ: ${CONTEXT_DIR}`);

  // contextディレクトリのレポートファイル一覧
  const files = (await readdir(CONTEXT_DIR))
    .filter((f) => f.startsWith("report_") && f.endsWith(".md"))
    .sort();

  if (files.length === 0) {
    console.log("同期対象のレポートファイルがありません。");
    return;
  }

  console.log(`レポートファイル: ${files.length}件`);

  // Notionに既に登録済みのページを取得
  const existing = await getExistingPages();
  console.log(`Notion登録済み: ${existing.size}件`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const fileName of files) {
    const pageId = existing.get(fileName);

    if (pageId && isUpdate) {
      // 更新モード: 既存ページを上書き
      try {
        const markdown = await readFile(join(CONTEXT_DIR, fileName), "utf-8");
        await updateNotionPage(pageId, fileName, markdown);
        console.log(`  [更新] ${fileName}`);
        updated++;
      } catch (err) {
        console.error(`  [エラー] ${fileName}: ${err.message}`);
      }
    } else if (pageId) {
      console.log(`  [スキップ] ${fileName} (登録済み)`);
      skipped++;
    } else {
      // 新規作成
      try {
        const markdown = await readFile(join(CONTEXT_DIR, fileName), "utf-8");
        await createNotionPage(fileName, markdown);
        console.log(`  [登録] ${fileName}`);
        created++;
      } catch (err) {
        console.error(`  [エラー] ${fileName}: ${err.message}`);
      }
    }
  }

  const parts = [];
  if (created) parts.push(`新規登録: ${created}件`);
  if (updated) parts.push(`更新: ${updated}件`);
  if (skipped) parts.push(`スキップ: ${skipped}件`);
  console.log(`\n=== 同期完了 === ${parts.join(" / ")}`);
}

main().catch((err) => {
  console.error("同期処理でエラーが発生しました:", err);
  process.exit(1);
});

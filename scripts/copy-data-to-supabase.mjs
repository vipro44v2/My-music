import "dotenv/config";
import { Client } from "pg";

const sourceUrl = process.env.LOCAL_DATABASE_URL;
const targetUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!sourceUrl) {
  console.error("Missing LOCAL_DATABASE_URL. Add your old/local Postgres URL to .env first.");
  process.exit(1);
}

if (!targetUrl) {
  console.error("Missing DIRECT_URL or DATABASE_URL for Supabase.");
  process.exit(1);
}

const tables = [
  { name: "User", columns: ["id", "email", "name", "password", "createdAt", "role"], conflict: ["id"] },
  { name: "Song", columns: ["id", "title", "artist", "duration", "src", "mood", "cloudinaryPublicId", "cloudinaryResourceType"], conflict: ["id"] },
  { name: "Setting", columns: ["key", "value", "updatedAt"], conflict: ["key"] },
  { name: "MoodImage", columns: ["id", "data", "publicId", "url", "resourceType", "mimeType", "size", "updatedAt"], conflict: ["id"] },
  { name: "Playlist", columns: ["id", "name", "userId", "createdAt"], conflict: ["id"] },
  { name: "PlaylistSong", columns: ["playlistId", "songId", "addedAt"], conflict: ["playlistId", "songId"] },
  { name: "Favorite", columns: ["userId", "songId", "createdAt"], conflict: ["userId", "songId"] },
  { name: "ListeningHistory", columns: ["id", "userId", "songId", "playedAt"], conflict: ["id"] },
  { name: "ChatMessage", columns: ["id", "userId", "content", "isAdmin", "isRead", "createdAt"], conflict: ["id"], optional: true },
];

function quote(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function sslFor(connectionString) {
  return connectionString.includes("supabase") || connectionString.includes("pooler")
    ? { rejectUnauthorized: false }
    : undefined;
}

async function tableExists(client, table) {
  const result = await client.query(
    "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = $1) as exists",
    [table],
  );
  return result.rows[0].exists;
}

async function copyTable(source, target, table) {
  const existsInSource = await tableExists(source, table.name);
  if (!existsInSource) {
    if (table.optional) return 0;
    throw new Error(`Source table ${table.name} does not exist.`);
  }

  const selectColumns = table.columns.map(quote).join(", ");
  const rows = (await source.query(`select ${selectColumns} from ${quote(table.name)}`)).rows;
  if (rows.length === 0) return 0;

  const insertColumns = table.columns.map(quote).join(", ");
  const placeholders = table.columns.map((_, index) => `$${index + 1}`).join(", ");
  const conflictColumns = table.conflict.map(quote).join(", ");
  const updateColumns = table.columns.filter((column) => !table.conflict.includes(column));
  const updateSql =
    updateColumns.length > 0
      ? `do update set ${updateColumns.map((column) => `${quote(column)} = excluded.${quote(column)}`).join(", ")}`
      : "do nothing";

  const sql = `insert into ${quote(table.name)} (${insertColumns}) values (${placeholders}) on conflict (${conflictColumns}) ${updateSql}`;

  for (const row of rows) {
    await target.query(sql, table.columns.map((column) => row[column]));
  }

  return rows.length;
}

async function main() {
  const source = new Client({ connectionString: sourceUrl, ssl: sslFor(sourceUrl) });
  const target = new Client({ connectionString: targetUrl, ssl: sslFor(targetUrl) });

  await source.connect();
  await target.connect();

  try {
    await target.query("begin");

    for (const table of tables) {
      const count = await copyTable(source, target, table);
      console.log(`${table.name}: copied ${count}`);
    }

    await target.query(`select setval(pg_get_serial_sequence('"Song"', 'id'), coalesce((select max("id") from "Song"), 1), true)`);
    await target.query("commit");
  } catch (error) {
    await target.query("rollback");
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

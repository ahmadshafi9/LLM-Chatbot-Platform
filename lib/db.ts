import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "chats.sqlite");

function createDb() {
  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  return database;
}

// Singleton for serverless: reuse one connection per process
const globalForDb = globalThis as unknown as { db: Database.Database | undefined };
export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

// Migrations
try { db.exec(`ALTER TABLE chats ADD COLUMN group_name TEXT`); } catch { /* already exists */ }
try { db.exec(`ALTER TABLE chats ADD COLUMN owner_id TEXT`); } catch { /* already exists */ }
db.exec(`CREATE INDEX IF NOT EXISTS chats_owner_id_idx ON chats (owner_id)`);
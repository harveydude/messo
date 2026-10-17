import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
let pool = null;
let pgliteInstance = null;

export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.includes('placeholder')) {
    if (!pool) {
      console.log('Connecting to cloud PostgreSQL / Supabase...');
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
      });
    }
    return {
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      isCloud: true,
    };
  }

  // Local embedded real PostgreSQL stored strictly on Disk D
  if (!pgliteInstance) {
    const dataDir = path.resolve(__dirname, '../../pgdata');
    console.log(`Using local embedded PostgreSQL on Disk D: ${dataDir}`);
    const pidFile = path.join(dataDir, 'postmaster.pid');
    const lockFile = path.join(dataDir, '.s.PGSQL.5432.lock.out');
    if (fs.existsSync(pidFile)) {
      try { fs.unlinkSync(pidFile); } catch (e) {}
    }
    if (fs.existsSync(lockFile)) {
      try { fs.unlinkSync(lockFile); } catch (e) {}
    }
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
  }

  return {
    query: async (text, params) => {
      const res = await pgliteInstance.query(text, params);
      return { rows: res.rows, rowCount: res.rows?.length || 0 };
    },
    exec: async (sql) => {
      await pgliteInstance.exec(sql);
    },
    isCloud: false,
  };
}

export async function initDb() {
  const db = await getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Initializing Meso database schema...');
  try {
    if (db.exec) {
      await db.exec(schemaSql);
    } else {
      const cleanSql = schemaSql.replace(/--.*$/gm, '');
      const statements = cleanSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const statement of statements) {
        await db.query(statement);
      }
    }
  } catch (err) {
    console.error('Schema init error:', err);
    throw err;
  }

  // Ensure all schema columns exist for existing tables
  const migrations = [
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS memo TEXT DEFAULT ''",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS narration TEXT DEFAULT ''",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'MANUAL_JE'",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'JOURNAL_ENTRY'",
    "ALTER TABLE journal_entries ALTER COLUMN doc_type DROP NOT NULL",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source_id TEXT",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'Craig Carlson'",
    "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'POSTED'",
    "ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS contact_id TEXT",
    "ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS project_id TEXT",
    "ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''",
    "ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS memo TEXT DEFAULT ''",
    "ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS cached_balance_paise BIGINT DEFAULT 0",
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE bills ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE bank_connections ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1'",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_json JSONB",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_json JSONB",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS event_summary TEXT",
    "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timezone_label TEXT DEFAULT 'Australian Eastern Daylight Time'"
  ];

  for (const sql of migrations) {
    try {
      if (db.exec) {
        await db.exec(sql);
      } else {
        await db.query(sql);
      }
    } catch {
      // ignore
    }
  }

  console.log('Meso database schema ready.');
}

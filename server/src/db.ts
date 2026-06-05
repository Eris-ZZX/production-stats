import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDB() {
  db.exec(`
    -- ===== 产品线 =====
    CREATE TABLE IF NOT EXISTS product_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      pwd_read TEXT,
      pwd_entry TEXT,
      pwd_config TEXT
    );

    -- ===== 后台管理员账号 =====
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super','config','viewer')),
      is_active INTEGER DEFAULT 1
    );

    -- ===== 工站 =====
    CREATE TABLE IF NOT EXISTS stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      major_section TEXT NOT NULL,
      minor_section TEXT NOT NULL,
      station_name TEXT NOT NULL,
      station_type TEXT DEFAULT '',
      is_data_entry_type INTEGER DEFAULT 1,
      mes_name TEXT DEFAULT '',
      abnormal_positions TEXT DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    -- ===== 缺陷代码 =====
    CREATE TABLE IF NOT EXISTS defect_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      defect_code TEXT NOT NULL UNIQUE,
      component TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      defect TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- ===== 缺陷字段选项 =====
    CREATE TABLE IF NOT EXISTS defect_field_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_type TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(field_type, name)
    );

    -- ===== 工站字段选项 =====
    CREATE TABLE IF NOT EXISTS station_field_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_type TEXT NOT NULL,
      name TEXT NOT NULL,
      is_data_entry INTEGER,
      visual_fpy_target REAL,
      functional_fpy_target REAL,
      air_leak_fpy_target REAL,
      UNIQUE(field_type, name)
    );

    -- ===== 制程投产记录 =====
    CREATE TABLE IF NOT EXISTS production_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES product_lines(id) ON DELETE CASCADE,
      record_date TEXT NOT NULL,
      station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
      output_qty INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(product_id, record_date, station_id)
    );

    -- ===== 工站明细记录 =====
    CREATE TABLE IF NOT EXISTS station_detail_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES product_lines(id) ON DELETE CASCADE,
      record_date TEXT NOT NULL,
      station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL,
      defect_type TEXT NOT NULL,
      defect_code TEXT NOT NULL,
      qty INTEGER DEFAULT 0,
      UNIQUE(product_id, record_date, station_id, defect_code)
    );

    -- ===== 外检记录 =====
    CREATE TABLE IF NOT EXISTS inspection_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES product_lines(id) ON DELETE CASCADE,
      product_sn TEXT NOT NULL,
      major_section TEXT DEFAULT '',
      minor_section TEXT DEFAULT '',
      production_defects TEXT DEFAULT '[]',
      fqc_defects TEXT DEFAULT '[]',
      inspection_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  seedData();
}

function seedData() {
  // Only seed if admin_accounts is empty
  const count = db.prepare('SELECT COUNT(*) as c FROM admin_accounts').get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare('INSERT OR IGNORE INTO admin_accounts (username, password, role) VALUES (?, ?, ?)');
  insert.run('admin', 'admin', 'super');
  insert.run('config', 'config', 'config');
  insert.run('viewer', 'viewer', 'viewer');

  // Seed default station types (locked set)
  const insStField = db.prepare('INSERT OR IGNORE INTO station_field_options (field_type, name, is_data_entry) VALUES (?, ?, ?)');
  insStField.run('stationType', '必过工站', 1);
  insStField.run('stationType', '被合并工站', 0);
  insStField.run('stationType', '前加工记录工站', 1);
  insStField.run('stationType', '可选工站', 1);
  insStField.run('stationType', 'FQC', 1);
}

export default db;

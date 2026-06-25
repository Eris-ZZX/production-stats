import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Use temp directory for test database
const DB_PATH = path.join(os.tmpdir(), 'test-production-stats-' + Date.now() + '.db');
let db: any;

function initTestDB() {
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE product_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      pwd_read TEXT,
      pwd_entry TEXT,
      pwd_config TEXT
    );
    CREATE TABLE product_skus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_line_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      UNIQUE(product_line_id, code)
    );
    CREATE TABLE stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      major_section TEXT NOT NULL,
      minor_section TEXT NOT NULL,
      station_name TEXT NOT NULL,
      station_type TEXT DEFAULT '',
      is_data_entry_type INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE defect_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      defect_code TEXT NOT NULL UNIQUE,
      component TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      defect TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE product_defect_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_line_id INTEGER NOT NULL,
      defect_code TEXT NOT NULL,
      component TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      defect TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      UNIQUE(product_line_id, defect_code)
    );
    CREATE TABLE station_field_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      field_type TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(field_type, name)
    );
    CREATE TABLE product_station_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_line_id INTEGER NOT NULL,
      field_type TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(product_line_id, field_type, name)
    );
    CREATE TABLE production_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_sku_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      station_id INTEGER,
      output_qty INTEGER DEFAULT 0,
      UNIQUE(product_sku_id, record_date, station_id)
    );
    CREATE TABLE station_detail_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_sku_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      station_id INTEGER,
      defect_type TEXT NOT NULL,
      defect_code TEXT NOT NULL,
      qty INTEGER DEFAULT 0,
      UNIQUE(product_sku_id, record_date, station_id, defect_code)
    );
    CREATE TABLE inspection_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_sku_id INTEGER NOT NULL,
      product_sn TEXT NOT NULL,
      major_section TEXT DEFAULT '',
      minor_section TEXT DEFAULT '',
      production_defects TEXT DEFAULT '[]',
      fqc_defects TEXT DEFAULT '[]',
      inspection_date TEXT NOT NULL,
      UNIQUE(product_sku_id, inspection_date, product_sn, major_section)
    );
  `);
}

beforeAll(() => { initTestDB(); });
afterAll(() => {
  if (db) { db.close(); }
  try { fs.unlinkSync(DB_PATH); } catch {}
  try { fs.unlinkSync(DB_PATH + '-wal'); } catch {}
  try { fs.unlinkSync(DB_PATH + '-shm'); } catch {}
});

describe('Integration: SKU CRUD with product isolation', () => {
  let productA: number;
  let productB: number;

  it('creates products', () => {
    const r1 = db.prepare("INSERT INTO product_lines (name) VALUES ('ProductA')").run();
    const r2 = db.prepare("INSERT INTO product_lines (name) VALUES ('ProductB')").run();
    productA = r1.lastInsertRowid as number;
    productB = r2.lastInsertRowid as number;
    expect(productA).toBeGreaterThan(0);
    expect(productB).toBeGreaterThan(0);
  });

  it('creates SKUs per product', () => {
    db.prepare('INSERT INTO product_skus (product_line_id, code) VALUES (?, ?)').run(productA, 'SKU-A1');
    db.prepare('INSERT INTO product_skus (product_line_id, code) VALUES (?, ?)').run(productA, 'SKU-A2');
    db.prepare('INSERT INTO product_skus (product_line_id, code) VALUES (?, ?)').run(productB, 'SKU-B1');
  });

  it('prevents duplicate SKU code within same product', () => {
    expect(() => {
      db.prepare('INSERT INTO product_skus (product_line_id, code) VALUES (?, ?)').run(productA, 'SKU-A1');
    }).toThrow();
  });

  it('allows same SKU code in different products', () => {
    const r = db.prepare('INSERT OR IGNORE INTO product_skus (product_line_id, code) VALUES (?, ?)').run(productB, 'SKU-A1');
    expect(r.changes).toBe(1);
  });

  it('filters SKUs by product_line_id', () => {
    const skusA = db.prepare('SELECT code FROM product_skus WHERE product_line_id = ? ORDER BY code').all(productA);
    const codesA = skusA.map((s: any) => s.code);
    expect(codesA).toContain('SKU-A1');
    expect(codesA).toContain('SKU-A2');
    expect(codesA).not.toContain('SKU-B1');
  });
});

describe('Integration: defect code isolation', () => {
  let productA: number;
  let productB: number;

  beforeAll(() => {
    const r = db.prepare("INSERT INTO product_lines (name) VALUES ('DefectTestA')").run();
    productA = r.lastInsertRowid as number;
    const r2 = db.prepare("INSERT INTO product_lines (name) VALUES ('DefectTestB')").run();
    productB = r2.lastInsertRowid as number;
  });

  it('copies master defect codes to product table', () => {
    db.prepare("INSERT OR IGNORE INTO defect_codes (defect_code, component, type, location, defect) VALUES (?,?,?,?,?)")
      .run('D001', '左耳', '外观', '外壳', '划伤');
    db.prepare("INSERT OR IGNORE INTO defect_codes (defect_code, component, type, location, defect) VALUES (?,?,?,?,?)")
      .run('D002', '右耳', '功能', '按键', '失灵');

    const r = db.prepare('INSERT INTO product_defect_codes (product_line_id, defect_code, component, type, location, defect) SELECT ?, defect_code, component, type, location, defect FROM defect_codes').run(productA);
    expect(r.changes).toBe(2);
  });

  it('product A codes are isolated from product B', () => {
    const codesA = db.prepare('SELECT defect_code FROM product_defect_codes WHERE product_line_id = ?').all(productA);
    const codesB = db.prepare('SELECT defect_code FROM product_defect_codes WHERE product_line_id = ?').all(productB);
    expect(codesA.length).toBe(2);
    expect(codesB.length).toBe(0);
  });
});

describe('Integration: production records UNIQUE constraint', () => {
  let skuId: number;

  beforeAll(() => {
    const r = db.prepare('INSERT INTO product_skus (product_line_id, code) VALUES (1, ?)').run('TEST-SKU');
    skuId = r.lastInsertRowid as number;
    db.prepare("INSERT INTO stations (major_section, minor_section, station_name) VALUES ('组装','A段','贴膜')").run();
  });

  it('prevents duplicate (sku, date, station)', () => {
    db.prepare('INSERT INTO production_records (product_sku_id, record_date, station_id, output_qty) VALUES (?,?,?,?)')
      .run(skuId, '2026-06-01', 1, 100);
    expect(() => {
      db.prepare('INSERT INTO production_records (product_sku_id, record_date, station_id, output_qty) VALUES (?,?,?,?)')
        .run(skuId, '2026-06-01', 1, 100);
    }).toThrow();
  });
});

describe('Integration: inspection records duplicate protection', () => {
  let skuId: number;

  beforeAll(() => {
    const r = db.prepare('INSERT INTO product_skus (product_line_id, code) VALUES (1, ?)').run('INSP-SKU');
    skuId = r.lastInsertRowid as number;
  });

  it('prevents duplicate inspection (sku, date, sn, section)', () => {
    db.prepare("INSERT INTO inspection_records (product_sku_id, product_sn, major_section, inspection_date) VALUES (?,?,?,?)")
      .run(skuId, 'SN001', '组装', '2026-06-01');
    expect(() => {
      db.prepare("INSERT INTO inspection_records (product_sku_id, product_sn, major_section, inspection_date) VALUES (?,?,?,?)")
        .run(skuId, 'SN001', '组装', '2026-06-01');
    }).toThrow();
  });
});

describe('Integration: station_detail_records UNIQUE constraint', () => {
  let skuId: number;

  beforeAll(() => {
    const r = db.prepare('INSERT INTO product_skus (product_line_id, code) VALUES (1, ?)').run('DETAIL-SKU');
    skuId = r.lastInsertRowid as number;
    db.prepare("INSERT INTO stations (major_section, minor_section, station_name) VALUES ('测试','B段','听音')").run();
  });

  it('prevents duplicate (sku, date, station, defect_code)', () => {
    db.prepare("INSERT INTO station_detail_records (product_sku_id, record_date, station_id, defect_type, defect_code, qty) VALUES (?,?,?,?,?,?)")
      .run(skuId, '2026-06-01', 2, '外观', 'D001', 5);
    expect(() => {
      db.prepare("INSERT INTO station_detail_records (product_sku_id, record_date, station_id, defect_type, defect_code, qty) VALUES (?,?,?,?,?,?)")
        .run(skuId, '2026-06-01', 2, '外观', 'D001', 5);
    }).toThrow();
  });
});

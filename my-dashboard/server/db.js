const { Pool } = require('pg');

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

const ssl =
  process.env.PGSSLMODE === 'disable' || process.env.PG_DISABLE_SSL
    ? false
    : { rejectUnauthorized: false };

if (!connectionString) {
  console.warn('SUPABASE_DB_URL or DATABASE_URL is not set. Database connections will fail.');
}

function normalizeSql(sql) {
  let index = 1;
  let inSingle = false;
  let inDouble = false;
  let out = '';
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) {
      const prev = sql[i - 1];
      if (prev !== '\\') inSingle = !inSingle;
      out += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      const prev = sql[i - 1];
      if (prev !== '\\') inDouble = !inDouble;
      out += ch;
      continue;
    }
    if (ch === '?' && !inSingle && !inDouble) {
      out += `$${index}`;
      index += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

class PgDb {
  constructor(pool) {
    this.pool = pool;
    this.serializing = false;
    this.queue = Promise.resolve();
    this.ready = this.init();
  }

  serialize(fn) {
    this.serializing = true;
    try {
      fn();
    } finally {
      this.serializing = false;
    }
  }

  _enqueue(op) {
    if (this.serializing) {
      this.queue = this.queue.then(op, op);
      return this.queue;
    }
    return op();
  }

  async init() {
    if (!connectionString) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        isSuper INTEGER,
        firstName TEXT,
        lastName TEXT,
        email TEXT,
        phone TEXT,
        mustChangePassword INTEGER DEFAULT 0
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        department TEXT,
        summary TEXT,
        description TEXT,
        creator TEXT,
        status TEXT,
        priority TEXT,
        category TEXT,
        assignee TEXT,
        createdAt TIMESTAMPTZ
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS user_tasks (
        user_id TEXT,
        task_id INTEGER,
        PRIMARY KEY (user_id, task_id)
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS role_tasks (
        role TEXT,
        task_id INTEGER,
        PRIMARY KEY (role, task_id)
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER,
        author TEXT,
        body TEXT,
        createdAt TIMESTAMPTZ
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER,
        comment_id INTEGER,
        original_name TEXT,
        stored_name TEXT,
        mime TEXT,
        size INTEGER,
        path TEXT,
        createdAt TIMESTAMPTZ,
        uploader TEXT
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY,
        notifyOnCreate INTEGER DEFAULT 1,
        notifyOnUpdate INTEGER DEFAULT 1,
        notifyOnComment INTEGER DEFAULT 1,
        roleRecipients TEXT,
        userRecipients TEXT,
        notification_matrix TEXT
      )
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        actor_id TEXT,
        actor_username TEXT,
        actor_role TEXT,
        action TEXT,
        entity_type TEXT,
        entity_id TEXT,
        detail TEXT,
        ip TEXT,
        createdAt TIMESTAMPTZ
      )
    `);

    await this.pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS mustChangePassword INTEGER DEFAULT 0
    `);

    await this.pool.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS department TEXT
    `);

    await this.pool.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS description TEXT
    `);

    await this.pool.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS category TEXT
    `);

    await this.pool.query(`
      ALTER TABLE tickets
      ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ
    `);

    await this.pool.query(`
      ALTER TABLE departments
      ADD COLUMN IF NOT EXISTS name TEXT
    `);

    await this.pool.query(`
      ALTER TABLE notification_settings
      ADD COLUMN IF NOT EXISTS notification_matrix TEXT
    `);
  }

  run(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    const values = Array.isArray(params) ? params : [];
    return this._enqueue(async () => {
      const normalized = normalizeSql(sql);
      const res = await this.pool.query(normalized, values);
      if (cb) cb.call({ lastID: res?.rows?.[0]?.id }, null);
      return res;
    }).catch((err) => {
      if (cb) cb(err);
      return null;
    });
  }

  get(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    const values = Array.isArray(params) ? params : [];
    return this._enqueue(async () => {
      const normalized = normalizeSql(sql);
      const res = await this.pool.query(normalized, values);
      const row = res?.rows?.[0] || undefined;
      if (cb) cb(null, row);
      return row;
    }).catch((err) => {
      if (cb) cb(err);
      return undefined;
    });
  }

  all(sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    const values = Array.isArray(params) ? params : [];
    return this._enqueue(async () => {
      const normalized = normalizeSql(sql);
      const res = await this.pool.query(normalized, values);
      const rows = res?.rows || [];
      if (cb) cb(null, rows);
      return rows;
    }).catch((err) => {
      if (cb) cb(err);
      return [];
    });
  }

  exec(sql, cb) {
    return this.run(sql, [], cb);
  }
}

function open() {
  const pool = new Pool({ connectionString, ssl });
  return new PgDb(pool);
}

module.exports = { open };

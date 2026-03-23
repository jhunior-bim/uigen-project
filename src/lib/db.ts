import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

function initDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS "User" (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "Project" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      userId TEXT,
      messages TEXT NOT NULL DEFAULT '[]',
      data TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
    );
  `);
  return db;
}

export const db = globalForDb.db ?? initDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

// Types

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  userId: string | null;
  messages: string;
  data: string;
  createdAt: Date;
  updatedAt: Date;
}

function now() {
  return new Date().toISOString();
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

function toProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    userId: row.userId as string | null,
    messages: row.messages as string,
    data: row.data as string,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

// User operations

export const users = {
  findByEmail(email: string): User | null {
    const row = db
      .prepare('SELECT * FROM "User" WHERE email = ?')
      .get(email) as Record<string, unknown> | undefined;
    return row ? toUser(row) : null;
  },

  findById(id: string): Pick<User, "id" | "email" | "createdAt"> | null {
    const row = db
      .prepare('SELECT id, email, createdAt FROM "User" WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: row.id as string,
      email: row.email as string,
      createdAt: new Date(row.createdAt as string),
    };
  },

  create(email: string, password: string): User {
    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(
      'INSERT INTO "User" (id, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
    ).run(id, email, password, ts, ts);
    return { id, email, password, createdAt: new Date(ts), updatedAt: new Date(ts) };
  },
};

// Project operations

export const projects = {
  create(data: {
    name: string;
    userId: string;
    messages: string;
    data: string;
  }): Project {
    const id = crypto.randomUUID();
    const ts = now();
    db.prepare(
      'INSERT INTO "Project" (id, name, userId, messages, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.name, data.userId, data.messages, data.data, ts, ts);
    return {
      id,
      name: data.name,
      userId: data.userId,
      messages: data.messages,
      data: data.data,
      createdAt: new Date(ts),
      updatedAt: new Date(ts),
    };
  },

  findById(id: string, userId: string): Project | null {
    const row = db
      .prepare('SELECT * FROM "Project" WHERE id = ? AND userId = ?')
      .get(id, userId) as Record<string, unknown> | undefined;
    return row ? toProject(row) : null;
  },

  findManyByUser(
    userId: string
  ): Pick<Project, "id" | "name" | "createdAt" | "updatedAt">[] {
    const rows = db
      .prepare(
        'SELECT id, name, createdAt, updatedAt FROM "Project" WHERE userId = ? ORDER BY updatedAt DESC'
      )
      .all(userId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }));
  },

  update(
    id: string,
    userId: string,
    data: { messages: string; data: string }
  ): void {
    db.prepare(
      'UPDATE "Project" SET messages = ?, data = ?, updatedAt = ? WHERE id = ? AND userId = ?'
    ).run(data.messages, data.data, now(), id, userId);
  },
};

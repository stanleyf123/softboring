import { getDb } from "./client";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function toPublicUser(row: Pick<UserRow, "id" | "email" | "created_at">): PublicUser {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function createUser(email: string, passwordHash: string): PublicUser {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    getDb()
      .prepare(
        `INSERT INTO users (id, email, password_hash, created_at)
         VALUES (@id, @email, @password_hash, @created_at)`,
      )
      .run({
        id,
        email,
        password_hash: passwordHash,
        created_at: createdAt,
      });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT") {
      const taken = new Error("email_taken");
      taken.name = "EmailTakenError";
      throw taken;
    }
    throw error;
  }
  return { id, email, createdAt };
}

export function getUserByEmail(email: string): UserRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM users WHERE email = ? COLLATE NOCASE`)
    .get(email) as UserRow | undefined;
}

export function getUserById(id: string): PublicUser | undefined {
  const row = getDb()
    .prepare(`SELECT id, email, created_at FROM users WHERE id = ?`)
    .get(id) as Pick<UserRow, "id" | "email" | "created_at"> | undefined;
  return row ? toPublicUser(row) : undefined;
}

export function deleteUser(id: string) {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(id);
    db.prepare(`DELETE FROM reviews WHERE user_id = ?`).run(id);
    return db.prepare(`DELETE FROM users WHERE id = ?`).run(id).changes;
  });
  return run();
}

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  user_id TEXT,
  energy TEXT NOT NULL DEFAULT '',
  drain TEXT NOT NULL DEFAULT '',
  less_of TEXT NOT NULL DEFAULT '',
  priorities TEXT NOT NULL DEFAULT '',
  feeling INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  locale TEXT,
  created_at TEXT NOT NULL,
  CHECK (feeling IS NULL OR (feeling >= 1 AND feeling <= 5)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_guest_created
  ON reviews (guest_id, created_at DESC);

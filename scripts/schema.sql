CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL,
  energy TEXT NOT NULL DEFAULT '',
  drain TEXT NOT NULL DEFAULT '',
  less_of TEXT NOT NULL DEFAULT '',
  priorities TEXT NOT NULL DEFAULT '',
  feeling INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  locale TEXT,
  created_at TEXT NOT NULL,
  CHECK (feeling IS NULL OR (feeling >= 1 AND feeling <= 5))
);

CREATE INDEX IF NOT EXISTS idx_reviews_guest_created
  ON reviews (guest_id, created_at DESC);

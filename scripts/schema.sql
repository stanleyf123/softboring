CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  created_at TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  plan_updated_at TEXT,
  plan_expires_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  nickname TEXT
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts (user_id);

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
  custom_answers TEXT NOT NULL DEFAULT '[]',
  mood TEXT,
  created_at TEXT NOT NULL,
  CHECK (feeling IS NULL OR (feeling >= 1 AND feeling <= 5)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_guest_created
  ON reviews (guest_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wall_notes (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  x REAL NOT NULL DEFAULT 80,
  y REAL NOT NULL DEFAULT 80,
  z INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'peach',
  hidden INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_notes_hidden_z ON wall_notes (hidden, z);
CREATE INDEX IF NOT EXISTS idx_wall_notes_user ON wall_notes (user_id);

CREATE TABLE IF NOT EXISTS wall_comments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES wall_comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_comments_note ON wall_comments (note_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wall_comments_parent ON wall_comments (parent_id);

CREATE TABLE IF NOT EXISTS stickers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_price_id TEXT,
  emoji TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_stickers (
  user_id TEXT NOT NULL,
  sticker_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, sticker_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wall_note_stickers (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sticker_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_note_stickers_note ON wall_note_stickers (note_id);

CREATE TABLE IF NOT EXISTS sticker_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  sticker_id TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO stickers (id, slug, name, price_cents, stripe_price_id, emoji, sort_order) VALUES
  ('sticker-star', 'star', 'Star', 99, NULL, '⭐', 1),
  ('sticker-heart', 'heart', 'Heart', 99, NULL, '💗', 2),
  ('sticker-sprout', 'sprout', 'Sprout', 99, NULL, '🌱', 3),
  ('sticker-tea', 'tea', 'Tea', 99, NULL, '🍵', 4),
  ('sticker-moon', 'moon', 'Moon', 99, NULL, '🌙', 5),
  ('sticker-cloud', 'cloud', 'Cloud', 99, NULL, '☁️', 6),
  ('sticker-peach', 'peach', 'Peach', 99, NULL, '🍑', 7),
  ('sticker-sparkle', 'sparkle', 'Sparkle', 99, NULL, '✨', 8);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('subscription', 'sticker', 'other')),
  stripe_event_id TEXT,
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  amount_cents INTEGER,
  currency TEXT,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  description TEXT,
  created_at TEXT NOT NULL,
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_event_unique
  ON payments (stripe_event_id) WHERE stripe_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_checkout_session_unique
  ON payments (checkout_session_id) WHERE checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_intent_unique
  ON payments (payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_email ON payments (email);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_kind_status ON payments (kind, status);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  onboarding_dismissed INTEGER NOT NULL DEFAULT 0,
  onboarding_history_seen INTEGER NOT NULL DEFAULT 0,
  onboarding_wall_seen INTEGER NOT NULL DEFAULT 0,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_weekday INTEGER NOT NULL DEFAULT 0,
  reminder_last_sent_at TEXT,
  custom_questions TEXT NOT NULL DEFAULT '[]',
  preferred_wall_color TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
  onboarding_timezone_set INTEGER NOT NULL DEFAULT 0,
  seasonal_frame INTEGER NOT NULL DEFAULT 0,
  focus_minutes INTEGER NOT NULL DEFAULT 25,
  focus_chime INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at);

CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL,
  invitee_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites (inviter_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS soft_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_soft_notes_user_week
  ON soft_notes (user_id, week_key);

CREATE TABLE IF NOT EXISTS soft_intentions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_soft_intentions_user_week
  ON soft_intentions (user_id, week_key);

CREATE TABLE IF NOT EXISTS wall_note_bookmarks (
  user_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, note_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_note_bookmarks_user_created
  ON wall_note_bookmarks (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wall_note_bookmarks_note
  ON wall_note_bookmarks (note_id);

CREATE TABLE IF NOT EXISTS wall_note_flags (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (note_id, reporter_id),
  FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_note_flags_note ON wall_note_flags (note_id);
CREATE INDEX IF NOT EXISTS idx_wall_note_flags_created ON wall_note_flags (created_at DESC);

CREATE TABLE IF NOT EXISTS wall_note_thanks (
  user_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, note_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_note_thanks_note ON wall_note_thanks (note_id);

CREATE TABLE IF NOT EXISTS wall_note_echoes (
  user_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, note_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (note_id) REFERENCES wall_notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wall_note_echoes_note
  ON wall_note_echoes (note_id, created_at);

CREATE TABLE IF NOT EXISTS soft_plus_gift_codes (
  code TEXT PRIMARY KEY,
  days INTEGER,
  permanent INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL,
  redeemed_at TEXT,
  redeemed_by TEXT,
  FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_soft_plus_gift_codes_created
  ON soft_plus_gift_codes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soft_plus_gift_codes_redeemed
  ON soft_plus_gift_codes (redeemed_at);

CREATE TABLE IF NOT EXISTS week_pauses (
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, week_key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_week_pauses_user ON week_pauses (user_id);

CREATE TABLE IF NOT EXISTS soft_letters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_soft_letters_user_week
  ON soft_letters (user_id, week_key);

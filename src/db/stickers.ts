import { getDb } from "./client";
import { STICKER_PACK_QTY } from "@/lib/wall-canvas";

export type StickerRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  stripe_price_id: string | null;
  emoji: string;
  sort_order: number;
};

export type PublicSticker = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  emoji: string;
};

function toPublic(row: StickerRow): PublicSticker {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: row.price_cents,
    emoji: row.emoji,
  };
}

export function listStickers(): PublicSticker[] {
  const rows = getDb()
    .prepare(
      `SELECT id, slug, name, price_cents, stripe_price_id, emoji, sort_order
       FROM stickers
       ORDER BY sort_order ASC, slug ASC`,
    )
    .all() as StickerRow[];
  return rows.map(toPublic);
}

export function getStickerById(id: string): StickerRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM stickers WHERE id = ?`)
    .get(id) as StickerRow | undefined;
}

export function getStickerBySlug(slug: string): StickerRow | undefined {
  return getDb()
    .prepare(`SELECT * FROM stickers WHERE slug = ?`)
    .get(slug) as StickerRow | undefined;
}

export function getStickerStripePriceId(sticker: StickerRow) {
  const fromRow = sticker.stripe_price_id?.trim();
  if (fromRow) return fromRow;
  const envName = `STRIPE_PRICE_STICKER_${sticker.slug.replace(/-/g, "_").toUpperCase()}`;
  return process.env[envName]?.trim() || null;
}

export function getPackStripePriceId() {
  return process.env.STRIPE_PRICE_STICKER_PACK?.trim() || null;
}

export function listInventory(userId: string): Record<string, number> {
  const rows = getDb()
    .prepare(
      `SELECT sticker_id, quantity FROM user_stickers WHERE user_id = ? AND quantity > 0`,
    )
    .all(userId) as Array<{ sticker_id: string; quantity: number }>;
  const inventory: Record<string, number> = {};
  for (const row of rows) {
    inventory[row.sticker_id] = row.quantity;
  }
  return inventory;
}

function addInventory(userId: string, stickerId: string, quantity: number) {
  getDb()
    .prepare(
      `INSERT INTO user_stickers (user_id, sticker_id, quantity)
       VALUES (@user_id, @sticker_id, @quantity)
       ON CONFLICT(user_id, sticker_id)
       DO UPDATE SET quantity = quantity + excluded.quantity`,
    )
    .run({
      user_id: userId,
      sticker_id: stickerId,
      quantity,
    });
}

export function fulfillStickerOrder(input: {
  sessionId: string;
  userId: string;
  kind: "sticker" | "sticker_pack";
  stickerId?: string | null;
}) {
  const db = getDb();
  const run = db.transaction(() => {
    const existing = db
      .prepare(`SELECT id FROM sticker_orders WHERE id = ?`)
      .get(input.sessionId) as { id: string } | undefined;
    if (existing) return { granted: false };

    db.prepare(
      `INSERT INTO sticker_orders (id, user_id, kind, sticker_id, quantity, created_at)
       VALUES (@id, @user_id, @kind, @sticker_id, @quantity, @created_at)`,
    ).run({
      id: input.sessionId,
      user_id: input.userId,
      kind: input.kind,
      sticker_id: input.kind === "sticker" ? input.stickerId ?? null : null,
      quantity: STICKER_PACK_QTY,
      created_at: new Date().toISOString(),
    });

    if (input.kind === "sticker_pack") {
      const stickers = listStickers();
      for (const sticker of stickers) {
        addInventory(input.userId, sticker.id, STICKER_PACK_QTY);
      }
    } else if (input.stickerId) {
      addInventory(input.userId, input.stickerId, STICKER_PACK_QTY);
    }

    return { granted: true };
  });

  return run();
}

export type PlacedSticker = {
  id: string;
  stickerId: string;
  slug: string;
  emoji: string;
  userId: string;
  createdAt: string;
};

export function listNoteStickers(noteId: string): PlacedSticker[] {
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.sticker_id, s.slug, s.emoji, p.user_id, p.created_at
       FROM wall_note_stickers p
       JOIN stickers s ON s.id = p.sticker_id
       WHERE p.note_id = ?
       ORDER BY datetime(p.created_at) ASC`,
    )
    .all(noteId) as Array<{
    id: string;
    sticker_id: string;
    slug: string;
    emoji: string;
    user_id: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    stickerId: row.sticker_id,
    slug: row.slug,
    emoji: row.emoji,
    userId: row.user_id,
    createdAt: row.created_at,
  }));
}

export function stickerCountsByNote(
  noteIds: string[],
): Map<string, Array<{ stickerId: string; slug: string; emoji: string; count: number }>> {
  const map = new Map<
    string,
    Array<{ stickerId: string; slug: string; emoji: string; count: number }>
  >();
  if (noteIds.length === 0) return map;

  const placeholders = noteIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `SELECT p.note_id, p.sticker_id, s.slug, s.emoji, COUNT(*) AS n
       FROM wall_note_stickers p
       JOIN stickers s ON s.id = p.sticker_id
       WHERE p.note_id IN (${placeholders})
       GROUP BY p.note_id, p.sticker_id
       ORDER BY n DESC`,
    )
    .all(...noteIds) as Array<{
    note_id: string;
    sticker_id: string;
    slug: string;
    emoji: string;
    n: number;
  }>;

  for (const row of rows) {
    const list = map.get(row.note_id) ?? [];
    list.push({
      stickerId: row.sticker_id,
      slug: row.slug,
      emoji: row.emoji,
      count: row.n,
    });
    map.set(row.note_id, list);
  }
  return map;
}

export function praiseCountForNote(noteId: string) {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM wall_note_stickers WHERE note_id = ?`)
    .get(noteId) as { n: number };
  return row.n;
}

export function placeSticker(input: {
  noteId: string;
  userId: string;
  stickerId: string;
}): { ok: true; praiseCount: number } | { ok: false; error: "empty" | "unknown" } {
  const db = getDb();
  const run = db.transaction(() => {
    const sticker = getStickerById(input.stickerId);
    if (!sticker) return { ok: false as const, error: "unknown" as const };

    const stock = db
      .prepare(
        `SELECT quantity FROM user_stickers WHERE user_id = ? AND sticker_id = ?`,
      )
      .get(input.userId, input.stickerId) as { quantity: number } | undefined;
    if (!stock || stock.quantity < 1) {
      return { ok: false as const, error: "empty" as const };
    }

    db.prepare(
      `UPDATE user_stickers SET quantity = quantity - 1
       WHERE user_id = ? AND sticker_id = ? AND quantity > 0`,
    ).run(input.userId, input.stickerId);

    db.prepare(
      `INSERT INTO wall_note_stickers (id, note_id, user_id, sticker_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      crypto.randomUUID(),
      input.noteId,
      input.userId,
      input.stickerId,
      new Date().toISOString(),
    );

    return { ok: true as const, praiseCount: praiseCountForNote(input.noteId) };
  });

  return run();
}

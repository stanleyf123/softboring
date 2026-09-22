import { getDb } from "./client";
import {
  KINDNESS_DIGEST_LIMIT,
  KINDNESS_ECHOES_SQL,
  KINDNESS_THANKS_SQL,
  shapeKindnessDigest,
  toKindnessEcho,
  toKindnessThanks,
  type KindnessDigest,
} from "@/lib/wall-kindness";

/**
 * Private in-app strip: thanks and echoes this member left since Monday
 * in their timezone. Nothing is mailed.
 */
export function listKindnessDigest(
  userId: string,
  weekStart: Date,
  timeZone?: string | null,
  now = new Date(),
): KindnessDigest {
  const since = weekStart.toISOString();
  const thanks = (
    getDb().prepare(KINDNESS_THANKS_SQL).all(userId, since, KINDNESS_DIGEST_LIMIT) as KindnessStampRow[]
  ).map((row) => toKindnessThanks(row));
  const echoes = (
    getDb().prepare(KINDNESS_ECHOES_SQL).all(userId, since, since, KINDNESS_DIGEST_LIMIT) as KindnessEchoRow[]
  ).map((row) => toKindnessEcho(row));
  return shapeKindnessDigest({
    thanks,
    echoes,
    weekStart,
    timeZone,
    now,
  });
}

type KindnessStampRow = {
  note_id: string;
  at: string;
  hidden: number;
  summary: string | null;
  energy: string | null;
  nickname: string | null;
  email: string | null;
};

type KindnessEchoRow = KindnessStampRow & { body: string | null };

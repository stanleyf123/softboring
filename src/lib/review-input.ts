import { routing } from "@/i18n/routing";
import { normalizeCustomAnswers } from "@/lib/custom-questions";
import { isGuestId } from "@/lib/guest";
import type { Review, ReviewAnswers } from "@/lib/review-types";
import { isWeekMood, type WeekMood } from "@/lib/week-mood";

const MAX_TEXT = 10_000;
const MAX_IMPORT = 100;

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

function asText(value: unknown) {
  if (value == null) return "";
  if (typeof value !== "string") {
    throw new InputError("Text fields must be strings.");
  }
  return value.slice(0, MAX_TEXT);
}

function asFeeling(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new InputError("Feeling must be an integer from 1 to 5.");
  }
  return value;
}

function asMood(value: unknown): WeekMood | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !isWeekMood(value)) {
    throw new InputError("Mood must be a soft color.");
  }
  return value;
}

function asLocale(value: unknown) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new InputError("Locale must be a string.");
  }
  if (!(routing.locales as readonly string[]).includes(value)) {
    throw new InputError("Locale is not supported.");
  }
  return value;
}

export function parseAnswers(body: unknown): ReviewAnswers & { locale?: string } {
  if (!body || typeof body !== "object") {
    throw new InputError("Expected a JSON object.");
  }
  const input = body as Record<string, unknown>;
  return {
    energy: asText(input.energy),
    drain: asText(input.drain),
    lessOf: asText(input.lessOf),
    priorities: asText(input.priorities),
    feeling: asFeeling(input.feeling),
    summary: asText(input.summary),
    customAnswers: normalizeCustomAnswers(input.customAnswers),
    mood: asMood(input.mood),
    locale: asLocale(input.locale),
  };
}

export function parseMoodPatch(body: unknown): WeekMood | null {
  if (!body || typeof body !== "object" || !("mood" in body)) {
    throw new InputError("Expected a mood.");
  }
  return asMood((body as { mood?: unknown }).mood);
}

function asIsoDate(value: unknown) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new InputError("createdAt must be an ISO date string.");
  }
  return new Date(value).toISOString();
}

function asId(value: unknown) {
  if (typeof value !== "string" || !isGuestId(value)) {
    throw new InputError("id must be a UUID.");
  }
  return value;
}

export function parseImportReviews(body: unknown): Review[] {
  if (!body || typeof body !== "object") {
    throw new InputError("Expected a JSON object.");
  }
  const reviews = (body as { reviews?: unknown }).reviews;
  if (!Array.isArray(reviews)) {
    throw new InputError("reviews must be an array.");
  }
  if (reviews.length > MAX_IMPORT) {
    throw new InputError(`Import is limited to ${MAX_IMPORT} reviews.`);
  }

  return reviews.map((item) => {
    const answers = parseAnswers(item);
    const record = item as Record<string, unknown>;
    return {
      ...answers,
      id: asId(record.id),
      createdAt: asIsoDate(record.createdAt),
    };
  });
}

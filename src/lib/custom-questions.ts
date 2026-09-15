export const MAX_CUSTOM_QUESTIONS = 3;
export const MAX_CUSTOM_PROMPT = 200;

export type CustomQuestion = {
  id: string;
  prompt: string;
};

export type CustomAnswer = {
  id: string;
  prompt: string;
  answer: string;
};

function asTrimmed(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseCustomQuestionsJson(raw: string | null | undefined): CustomQuestion[] {
  if (!raw) return [];
  try {
    return normalizeCustomQuestions(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function parseCustomAnswersJson(raw: string | null | undefined): CustomAnswer[] {
  if (!raw) return [];
  try {
    return normalizeCustomAnswers(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function normalizeCustomQuestions(value: unknown): CustomQuestion[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const questions: CustomQuestion[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; prompt?: unknown };
    const prompt = asTrimmed(record.prompt, MAX_CUSTOM_PROMPT);
    if (!prompt) continue;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim().slice(0, 64)
        : crypto.randomUUID();
    if (seen.has(id)) continue;
    seen.add(id);
    questions.push({ id, prompt });
    if (questions.length >= MAX_CUSTOM_QUESTIONS) break;
  }
  return questions;
}

export function normalizeCustomAnswers(value: unknown): CustomAnswer[] {
  if (!Array.isArray(value)) return [];
  const answers: CustomAnswer[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; prompt?: unknown; answer?: unknown };
    const prompt = asTrimmed(record.prompt, MAX_CUSTOM_PROMPT);
    const answer = asTrimmed(record.answer, 10_000);
    if (!prompt && !answer) continue;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim().slice(0, 64)
        : `custom-${answers.length + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    answers.push({ id, prompt, answer });
    if (answers.length >= MAX_CUSTOM_QUESTIONS) break;
  }
  return answers;
}

export function answersForQuestions(
  questions: CustomQuestion[],
  answers: CustomAnswer[],
): CustomAnswer[] {
  const byId = new Map(answers.map((item) => [item.id, item]));
  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    answer: byId.get(question.id)?.answer ?? "",
  }));
}

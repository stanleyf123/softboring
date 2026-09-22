import type { CustomAnswer } from "@/lib/custom-questions";
import type { WeekMood } from "@/lib/week-mood";

export type ReviewAnswers = {
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
  feeling: number | null;
  summary: string;
  customAnswers: CustomAnswer[];
  mood?: WeekMood | null;
};

export type Review = ReviewAnswers & {
  id: string;
  createdAt: string;
  locale?: string;
};

export const emptyDraft = (): ReviewAnswers => ({
  energy: "",
  drain: "",
  lessOf: "",
  priorities: "",
  feeling: null,
  summary: "",
  customAnswers: [],
});

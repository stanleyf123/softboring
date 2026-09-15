export type ReviewAnswers = {
  energy: string;
  drain: string;
  lessOf: string;
  priorities: string;
  feeling: number | null;
  summary: string;
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
});

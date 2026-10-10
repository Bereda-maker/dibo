export type TopicStat = {
  topicId: string; topicName: string; subjectName: string;
  attempted: number; correct: number; recentAttempted: number; recentCorrect: number;
  noteCompleted: boolean; daysSincePracticed: number | null;
};
export type Recommendation = {
  topicId: string; priority: "HIGH" | "MEDIUM" | "LOW"; action: "PRACTICE" | "READ_NOTE";
  difficulty: "EASY" | "MEDIUM" | "HARD"; questionCount: number; reason: string; score: number;
};

export const MIN_RECOMMENDATION_SAMPLE = 5;

/** Explainable rules: every recommendation carries a human-readable reason. */
export function recommend(stats: TopicStat[], limit = 5): Recommendation[] {
  const out: Recommendation[] = [];
  for (const s of stats) {
    if (s.attempted < MIN_RECOMMENDATION_SAMPLE) {
      out.push({ topicId: s.topicId, priority: "LOW", action: s.noteCompleted ? "PRACTICE" : "READ_NOTE", difficulty: "EASY", questionCount: 10, score: 20,
        reason: `You have only answered ${s.attempted} ${s.topicName} question${s.attempted === 1 ? "" : "s"} so far — not enough to judge your level yet.` });
      continue;
    }
    // Weight recent performance more heavily when there is enough recent data.
    const overall = (s.correct / s.attempted) * 100;
    const recent = s.recentAttempted >= MIN_RECOMMENDATION_SAMPLE ? (s.recentCorrect / s.recentAttempted) * 100 : overall;
    const acc = Math.round(0.4 * overall + 0.6 * recent);
    const stale = s.daysSincePracticed != null && s.daysSincePracticed > 14 ? 10 : 0;
    const score = 100 - acc + stale;
    const priority = acc < 55 ? "HIGH" : acc < 75 ? "MEDIUM" : "LOW";
    const difficulty = acc < 40 ? "EASY" : acc < 75 ? "MEDIUM" : "HARD";
    const action = acc < 40 && !s.noteCompleted ? "READ_NOTE" : "PRACTICE";
    out.push({ topicId: s.topicId, priority, action, difficulty, questionCount: 15, score,
      reason: `Your accuracy in ${s.subjectName} → ${s.topicName} is ${acc}% across your last ${Math.max(s.recentAttempted, s.attempted)} questions.${stale ? " You have not practiced it in over two weeks." : ""}` });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

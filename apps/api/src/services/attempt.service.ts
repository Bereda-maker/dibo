import { scoreExam, isWithinDeadline, type ScorableQuestion, type SubmittedAnswer, type ScoreResult } from "@dibora/core/exam-scoring";
import { AppError, Errors } from "../utils/errors";

export type ExamForAttempt = { id: string; minutes: number; passing: number; attemptLimit: number | null; requiresPremium: boolean; randomize: boolean; questions: ScorableQuestion[] };
export type StoredAttempt = { id: string; studentId: string; examId: string; status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED"; deadlineAt: Date; questionOrder: string[]; answers: SubmittedAnswer[]; result?: ScoreResult };

/** Persistence port. The Drizzle implementation lives in db/attempt.repo.ts; tests use an in-memory fake. */
export interface AttemptRepo {
  getExam(examId: string): Promise<ExamForAttempt | null>;
  findInProgress(studentId: string, examId: string): Promise<StoredAttempt | null>;
  countAttempts(studentId: string, examId: string): Promise<number>;
  create(a: { studentId: string; examId: string; deadlineAt: Date; questionOrder: string[] }): Promise<StoredAttempt>;
  get(attemptId: string, studentId: string): Promise<StoredAttempt | null>; // scoped to the owner: other students' attempts are invisible
  upsertAnswers(attemptId: string, answers: SubmittedAnswer[]): Promise<void>;
  /** Single transaction: only transitions IN_PROGRESS -> final once; returns false if already finalized. */
  finalize(attemptId: string, status: "SUBMITTED" | "EXPIRED", result: ScoreResult): Promise<boolean>;
}

const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j]!, r[i]!]; } return r; };

export class AttemptService {
  constructor(private repo: AttemptRepo, private now: () => Date = () => new Date()) {}

  async start(studentId: string, examId: string, isPremium: boolean) {
    const exam = await this.repo.getExam(examId);
    if (!exam) throw Errors.notFound("Exam");
    if (exam.requiresPremium && !isPremium) throw Errors.premiumRequired("mockExams");
    const existing = await this.repo.findInProgress(studentId, examId);
    if (existing) { // resume after refresh; if the clock has run out, close it instead of resuming
      if (!isWithinDeadline(existing.deadlineAt, this.now(), 0)) await this.finish(existing, exam, "EXPIRED");
      else return this.view(existing);
    }
    if (exam.attemptLimit != null && (await this.repo.countAttempts(studentId, examId)) >= exam.attemptLimit) throw new AppError(409, "ATTEMPT_LIMIT", "You have used all attempts for this exam");
    const ids = exam.questions.map((q) => q.id);
    const created = await this.repo.create({ studentId, examId, deadlineAt: new Date(this.now().getTime() + exam.minutes * 60_000), questionOrder: exam.randomize ? shuffle(ids) : ids });
    return this.view(created);
  }

  async saveAnswers(studentId: string, attemptId: string, answers: SubmittedAnswer[]) {
    const a = await this.repo.get(attemptId, studentId);
    if (!a) throw Errors.notFound("Attempt");
    if (a.status !== "IN_PROGRESS") throw new AppError(409, "ATTEMPT_CLOSED", "This attempt is already submitted");
    if (!isWithinDeadline(a.deadlineAt, this.now())) { const exam = (await this.repo.getExam(a.examId))!; return { expired: true as const, result: await this.finish(a, exam, "EXPIRED") }; }
    const allowed = new Set(a.questionOrder); // ignore answers for questions that are not part of this attempt
    await this.repo.upsertAnswers(attemptId, answers.filter((x) => allowed.has(x.questionId)));
    return { expired: false as const, savedAt: this.now().toISOString() };
  }

  async submit(studentId: string, attemptId: string) {
    const a = await this.repo.get(attemptId, studentId);
    if (!a) throw Errors.notFound("Attempt");
    if (a.status !== "IN_PROGRESS" && a.result) return a.result; // idempotent
    const exam = (await this.repo.getExam(a.examId))!;
    return this.finish(a, exam, isWithinDeadline(a.deadlineAt, this.now(), 0) ? "SUBMITTED" : "EXPIRED");
  }

  private async finish(a: StoredAttempt, exam: ExamForAttempt, status: "SUBMITTED" | "EXPIRED") {
    const byId = new Map(exam.questions.map((q) => [q.id, q]));
    const qs = a.questionOrder.map((id) => byId.get(id)).filter((q): q is ScorableQuestion => !!q);
    const result = scoreExam(qs, a.answers, exam.passing); // scored from stored answers only
    const first = await this.repo.finalize(a.id, status, result);
    return first ? result : (await this.repo.get(a.id, a.studentId))?.result ?? result;
  }

  private view(a: StoredAttempt) { return { attemptId: a.id, deadlineAt: a.deadlineAt.toISOString(), questionOrder: a.questionOrder, answers: a.answers, resumed: a.answers.length > 0 }; }
}

import { api } from "./api";

type PlannerStream = "natural" | "social";
type SubjectOption = { id: string; stream: string | null };

const STREAM_LABEL: Record<PlannerStream, string> = {
  natural: "Natural Science",
  social: "Social Science",
};

export async function getGoalPlannerSubjectIds(stream: unknown): Promise<string[]> {
  if (stream !== "natural" && stream !== "social") throw new Error("The selected study stream is invalid.");
  const subjects = await api<SubjectOption[]>("/subjects");
  const ids = subjects.filter((subject) => subject.stream === STREAM_LABEL[stream]).map((subject) => subject.id);
  if (!ids.length) throw new Error(`No published subjects were found for ${STREAM_LABEL[stream]}.`);
  return ids;
}

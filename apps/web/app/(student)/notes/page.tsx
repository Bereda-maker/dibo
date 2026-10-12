"use client";
import { DEMO } from "../../../lib/config";
import { LiveNotes } from "../../../features/live/Learn";
import { NotesLibrary, type NotesEntry, type NotesSubject } from "../../../features/NotesLibrary";
import { NOTES, SUBJECTS, TOPICS, topicName } from "../../../lib/mock";
import { useStore } from "../../../lib/store";
import { useState } from "react";

function DemoP() {
  const { state } = useStore();
  const profile = state.user;
  const [selectedSubjectKey, setSelectedSubjectKey] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const grade = selectedGrade ?? (profile && profile.grade >= 9 && profile.grade <= 12 ? profile.grade : 12);
  const allowedSubjectIds = profile?.subjects.length ? profile.subjects : SUBJECTS.map((subject) => subject.id);
  const subjects: NotesSubject[] = SUBJECTS.filter((subject) => allowedSubjectIds.includes(subject.id)).flatMap((subject) =>
    [9, 10, 11, 12].map((subjectGrade) => ({ id: `${subject.id}-${subjectGrade}`, subjectKey: subject.id, slug: subject.id, names: { en: subject.name }, grade: subjectGrade })));
  const notes: NotesEntry[] = NOTES.flatMap((note) => {
    const topic = TOPICS.find((item) => item.id === note.topicId);
    const subject = SUBJECTS.find((item) => item.id === topic?.subjectId);
    if (!topic || !subject || !allowedSubjectIds.includes(subject.id) || subject.id !== selectedSubjectKey) return [];
    const titleGrade = note.title.match(/\b(?:grade|gr\.?|g)\s*(9|10|11|12)\b/i);
    if (titleGrade && Number(titleGrade[1]) !== grade) return [];
    return [{ id: note.id, title: note.title, summary: note.summary, topicId: topic.id, topicName: { en: topic.name }, topicSlug: topic.id }];
  });
  const completedTopicIds = NOTES.filter((note) => state.notesDone.includes(note.id)).map((note) => note.topicId);
  const bookmarkedNoteIds = state.bookmarks.filter((item) => item.type === "NOTE").map((item) => item.id);

  return <NotesLibrary subjects={subjects} subjectSource={profile?.subjects.length ? "profile" : "all"}
    selectedSubjectKey={selectedSubjectKey} onSelectSubject={(subjectKey) => { setSelectedSubjectKey(subjectKey); setSelectedGrade(profile && profile.grade >= 9 && profile.grade <= 12 ? profile.grade : 12); }}
    grade={grade} onSelectGrade={setSelectedGrade} notes={notes} completedTopicIds={completedTopicIds} bookmarkedNoteIds={bookmarkedNoteIds} />;
}

export default function Page() { return DEMO ? <DemoP /> : <LiveNotes />; }

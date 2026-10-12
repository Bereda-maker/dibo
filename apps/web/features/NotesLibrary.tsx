"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Bookmark, CheckCircle2, GraduationCap, Layers3, Search, Sparkles } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageHeader, cx, inputCls } from "../components/ui";
import { useLocalizedName } from "../lib/i18n";

export type NotesSubject = { id: string; subjectKey: string; slug: string; names: Record<string, string>; grade: number; stream?: string | null };
export type NotesEntry = { id: string; title: string; summary: string | null; topicId: string; topicName: Record<string, string>; topicSlug: string };
type Props = {
  subjects: NotesSubject[];
  subjectSource: "profile" | "all";
  subjectLoading?: boolean;
  subjectError?: string;
  selectedSubjectKey: string;
  onSelectSubject: (subjectKey: string) => void;
  grade: number;
  onSelectGrade: (grade: number) => void;
  notes: NotesEntry[];
  notesLoading?: boolean;
  notesError?: string;
  completedTopicIds: string[];
  bookmarkedNoteIds: string[];
};

const GRADES = [9, 10, 11, 12];

export function NotesLibrary({ subjects, subjectSource, subjectLoading = false, subjectError, selectedSubjectKey, onSelectSubject, grade, onSelectGrade, notes, notesLoading = false, notesError, completedTopicIds, bookmarkedNoteIds }: Props) {
  const localizedName = useLocalizedName();
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const subjectChoices = useMemo(() => Array.from(new Map(subjects.map((subject) => [subject.subjectKey, subject])).values()), [subjects]);
  const selectedSubject = subjectChoices.find((subject) => subject.subjectKey === selectedSubjectKey);
  const units = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; notes: NotesEntry[] }>();
    for (const note of notes) {
      const unit = grouped.get(note.topicId) ?? { id: note.topicId, name: localizedName(note.topicName) || note.topicSlug, notes: [] };
      unit.notes.push(note);
      grouped.set(note.topicId, unit);
    }
    return Array.from(grouped.values());
  }, [localizedName, notes]);
  const matchingNotes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return units.flatMap((unit) => unit.notes.filter((note) => unitFilter === "all" || unit.id === unitFilter).filter((note) => !term || `${note.title} ${note.summary ?? ""} ${unit.name}`.toLocaleLowerCase().includes(term)).map((note) => ({ ...note, unitName: unit.name })));
  }, [search, unitFilter, units]);
  const doneUnits = units.filter((unit) => completedTopicIds.includes(unit.id)).length;

  return <>
    <PageHeader title="Short notes" sub="A focused library for every subject, grade and learning unit." action={<Button href="/profile" variant="secondary">Edit profile subjects</Button>} />
    <Card className="overflow-hidden !p-0">
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-surface to-accent/15 p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <Badge tone="accent"><span className="inline-flex items-center gap-1"><Sparkles size={12} aria-hidden />Your study library</span></Badge>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Learn one unit at a time.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">Pick a subject, set your grade, and jump straight into clear notes organized by unit.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border/70 bg-surface/80 px-4 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen size={22} aria-hidden /></span>
            <div><p className="text-lg font-bold leading-tight">{notes.length}</p><p className="text-xs text-muted">notes in this view</p></div>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-4 sm:p-6">
        <section aria-labelledby="notes-subject-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">01 · Subject</p><h3 id="notes-subject-heading" className="mt-1 text-lg font-bold">Choose a subject</h3></div>
            <p className="text-xs text-muted">{subjectSource === "profile" ? "Showing subjects from your student profile." : "No profile subjects selected — all available subjects are shown."}</p>
          </div>
          {subjectError ? <p role="alert" className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">{subjectError}</p> : subjectLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-border/50" />)}</div> : subjectChoices.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectChoices.map((subject) => {
              const active = subject.subjectKey === selectedSubjectKey;
              return <button type="button" key={subject.subjectKey} aria-pressed={active} onClick={() => { onSelectSubject(subject.subjectKey); setSearch(""); setUnitFilter("all"); }} className={cx("group flex min-h-[92px] items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-surface hover:border-primary/50 hover:bg-bg/60")}>
                <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl transition", active ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary/15")}><BookOpen size={19} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{localizedName(subject.names) || subject.slug}</span><span className="mt-1 block text-xs text-muted">National exam prep · Grades 9–12</span></span>
                {active && <CheckCircle2 size={17} className="mt-1 shrink-0 text-primary" aria-label="Selected" />}
              </button>;
            })}
          </div> : <EmptyState title="No subjects are available yet" body="Choose subjects in your profile or check back when curriculum has been published." action={<Button href="/profile" variant="secondary">Update profile</Button>} />}
        </section>

        {selectedSubject && <section aria-labelledby="notes-grade-heading" className="border-t border-border pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">02 · Grade</p><h3 id="notes-grade-heading" className="mt-1 text-lg font-bold">{localizedName(selectedSubject.names) || selectedSubject.slug}<span className="px-2 text-muted">/</span>Choose a grade</h3><p className="mt-1 text-sm text-muted">Switch grades to explore the matching curriculum.</p></div>
            <div role="group" aria-label="Choose grade" className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-bg/60 p-1.5 sm:inline-grid">
              {GRADES.map((option) => <button key={option} type="button" aria-pressed={grade === option} onClick={() => { onSelectGrade(option); setUnitFilter("all"); }} className={cx("min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", grade === option ? "bg-primary text-white shadow-sm" : "text-muted hover:bg-surface hover:text-text")}>Grade {option}</button>)}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            <div className="rounded-xl bg-bg/70 p-3"><p className="flex items-center gap-1.5 text-xs text-muted"><Layers3 size={14} aria-hidden />Units</p><p className="mt-1 text-lg font-bold">{units.length}</p></div>
            <div className="rounded-xl bg-bg/70 p-3"><p className="flex items-center gap-1.5 text-xs text-muted"><BookOpen size={14} aria-hidden />Notes</p><p className="mt-1 text-lg font-bold">{notes.length}</p></div>
            <div className="rounded-xl bg-bg/70 p-3"><p className="flex items-center gap-1.5 text-xs text-muted"><CheckCircle2 size={14} aria-hidden />Units done</p><p className="mt-1 text-lg font-bold">{doneUnits}<span className="text-sm font-medium text-muted"> / {units.length}</span></p></div>
          </div>

          <>
            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by unit">
                <button type="button" aria-pressed={unitFilter === "all"} onClick={() => setUnitFilter("all")} className={cx("min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition", unitFilter === "all" ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:border-primary/50")}>All units</button>
                {units.map((unit) => <button type="button" key={unit.id} aria-pressed={unitFilter === unit.id} onClick={() => setUnitFilter(unit.id)} className={cx("min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition", unitFilter === unit.id ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:border-primary/50")}>{unit.name}<span className="ml-1.5 opacity-70">{unit.notes.length}</span></button>)}
              </div>
              <label className="relative block w-full shrink-0 lg:max-w-xs"><span className="sr-only">Search notes and units</span><Search size={16} className="absolute left-3 top-3.5 text-muted" aria-hidden /><input type="search" placeholder="Search notes or units" className={inputCls + " pl-9"} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            </div>

            {notesError ? <p role="alert" className="mt-5 rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">{notesError}</p> : notesLoading ? <div aria-busy="true" className="mt-5 grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-border/50" />)}</div> : matchingNotes.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {matchingNotes.map((note) => {
                const complete = completedTopicIds.includes(note.topicId);
                const saved = bookmarkedNoteIds.includes(note.id);
                return <Link key={note.id} href={`/notes/${note.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                  <Card className="h-full !p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:shadow-md sm:!p-5">
                    <div className="flex items-center justify-between gap-2"><span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-primary"><Layers3 size={13} aria-hidden />{note.unitName}</span><span className="flex shrink-0 items-center gap-2">{saved && <Bookmark size={15} className="fill-accent text-accent" aria-label="Bookmarked" />}{complete && <CheckCircle2 size={16} className="text-success" aria-label="Unit completed" />}</span></div>
                    <h4 className="mt-3 line-clamp-2 font-bold leading-snug">{note.title}</h4>
                    <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted">{note.summary || "Open this note for a concise, unit-focused review."}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold"><span className={complete ? "text-success" : "text-primary"}>{complete ? "Unit completed" : "Open note"}</span><ArrowUpRight size={16} className="text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden /></div>
                  </Card>
                </Link>;
              })}
            </div> : <div className="mt-5"><EmptyState title={search ? "No notes match your search" : "No notes published for this grade yet"} body={search ? "Try another title or unit name, or clear your search." : "When notes are added to this subject and grade, they will appear here by unit."} /></div>}
          </>
        </section>}

        {!selectedSubjectKey && subjectChoices.length > 0 && !subjectLoading && <div className="flex items-center gap-2 rounded-xl border border-border bg-bg/60 p-3 text-sm text-muted"><GraduationCap size={17} className="shrink-0 text-primary" aria-hidden /><span>Choose a subject above to reveal grade levels and unit notes.</span></div>}
      </div>
    </Card>
  </>;
}

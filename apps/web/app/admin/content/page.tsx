"use client";
import { useState } from "react";
import { Button, Card, PageHeader, Skeleton, inputCls, useToast } from "../../../components/ui";
import { StatusTable } from "../../../components/StatusTable";
import { useAdmin, type Status } from "../../../lib/admin";
import { subjectName } from "../../../lib/mock";
export default function P() {
  const { d, set } = useAdmin(); const toast = useToast(); const [name, setName] = useState(""); if (!d) return <Skeleton className="h-60" />;
  type K = "subjects" | "topics" | "notes";
  const ch = (k: K) => (ids: string[], s: Status) => { set((x) => ({ ...x, [k]: (x[k] as { id: string }[]).map((r) => ids.includes(r.id) ? { ...r, status: s } : r) }) as typeof x, `Set ${ids.length} ${k} to ${s}`); toast(`${ids.length} ${k} → ${s}`); };
  const rm = (k: K) => (ids: string[]) => set((x) => ({ ...x, [k]: (x[k] as { id: string }[]).filter((r) => !ids.includes(r.id)) }) as typeof x, `Deleted ${ids.length} ${k}`);
  return <><PageHeader title="Subjects, topics & notes" sub="Lifecycle: Draft → Published → Archived. No code changes needed." />
    <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return toast("Enter a subject name", "error"); set((x) => ({ ...x, subjects: [...x.subjects, { id: "sub-" + Date.now(), name: name.trim(), status: "DRAFT" }] }), `Created subject ${name}`); setName(""); toast("Subject created as draft"); }}><input aria-label="New subject name" placeholder="New subject name" className={inputCls + " max-w-xs"} value={name} onChange={(e) => setName(e.target.value)} /><Button type="submit">Add subject</Button></form>
    <div className="space-y-6"><Card><h2 className="mb-3 font-bold">Subjects</h2><StatusTable rows={d.subjects} cols={[{ key: "n", label: "Name", render: (r) => r.name }]} onChange={ch("subjects")} onDelete={rm("subjects")} /></Card>
      <Card><h2 className="mb-3 font-bold">Topics</h2><StatusTable rows={d.topics} cols={[{ key: "n", label: "Topic", render: (r) => r.name }, { key: "s", label: "Subject", render: (r) => subjectName(r.subjectId) }]} onChange={ch("topics")} onDelete={rm("topics")} /></Card>
      <Card><h2 className="mb-3 font-bold">Short notes</h2><StatusTable rows={d.notes} cols={[{ key: "n", label: "Title", render: (r) => r.title }]} onChange={ch("notes")} onDelete={rm("notes")} /></Card></div></>; }

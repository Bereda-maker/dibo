"use client";
import { useState } from "react";
import { Badge, Button, inputCls } from "./ui";
import { DataTable } from "./DataTable";
import type { Status } from "../lib/admin";
type Row = { id: string; status: Status } & Record<string, unknown>;
/** Shared lifecycle table: search, filter, bulk publish/unpublish/archive/delete. */
export function StatusTable<T extends Row>({ rows, cols, onChange, onDelete, extra }: { rows: T[]; cols: { key: string; label: string; render: (r: T) => React.ReactNode }[]; onChange: (ids: string[], s: Status) => void; onDelete: (ids: string[]) => void; extra?: (r: T) => React.ReactNode }) {
  const [q, setQ] = useState(""); const [f, setF] = useState("ALL"); const [sel, setSel] = useState<string[]>([]);
  const list = rows.filter((r) => (f === "ALL" || r.status === f) && JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  const tone = (s: Status) => (s === "PUBLISHED" ? "success" : s === "DRAFT" ? "warning" : "muted") as "success" | "warning" | "muted";
  return (<div><div className="mb-3 flex flex-wrap gap-2"><input aria-label="Search" placeholder="Search" className={inputCls + " max-w-xs"} value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Status filter" className={inputCls + " max-w-[160px]"} value={f} onChange={(e) => setF(e.target.value)}><option value="ALL">All statuses</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></div>
    {sel.length > 0 && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-border/40 p-2 text-sm"><span>{sel.length} selected</span><Button variant="secondary" onClick={() => { onChange(sel, "PUBLISHED"); setSel([]); }}>Publish</Button><Button variant="secondary" onClick={() => { onChange(sel, "DRAFT"); setSel([]); }}>Unpublish</Button><Button variant="secondary" onClick={() => { onChange(sel, "ARCHIVED"); setSel([]); }}>Archive</Button><Button variant="danger" onClick={() => { if (confirm(`Delete ${sel.length} item(s)?`)) { onDelete(sel); setSel([]); } }}>Delete</Button></div>}
    <DataTable rows={list} cols={[{ key: "_s", label: "", render: (r) => <input type="checkbox" aria-label="Select row" checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} /> }, ...cols, { key: "_st", label: "Status", render: (r) => <Badge tone={tone(r.status)}>{r.status}</Badge> }, ...(extra ? [{ key: "_x", label: "", render: extra }] : [])]} /></div>);
}

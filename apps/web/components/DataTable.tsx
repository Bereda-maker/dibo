/** Table on desktop, stacked cards on phones. */
export function DataTable<T extends { id: string }>({ rows, cols, empty = "Nothing here yet." }: { rows: T[]; cols: { key: string; label: string; render: (r: T) => React.ReactNode }[]; empty?: string }) {
  if (!rows.length) return <p className="rounded-card border border-dashed border-border p-6 text-center text-sm text-muted">{empty}</p>;
  return (<>
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-muted">{cols.map((c) => <th key={c.key} scope="col" className="py-2 pr-4 font-medium">{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border/60">{cols.map((c) => <td key={c.key} className="py-3 pr-4">{c.render(r)}</td>)}</tr>)}</tbody></table></div>
    <ul className="space-y-3 md:hidden">{rows.map((r) => <li key={r.id} className="rounded-card border border-border p-4 space-y-1">{cols.map((c) => <div key={c.key} className="flex justify-between gap-3 text-sm"><span className="text-muted">{c.label}</span><span className="text-right">{c.render(r)}</span></div>)}</li>)}</ul></>);
}

"use client";
import { useState } from "react";
import { Button, Card, Field, PageHeader, inputCls, useToast } from "../../../components/ui";
import { useStore } from "../../../lib/store";
export default function P() {
  const toast = useToast(); const { update } = useStore(); const [t, setT] = useState(""); const [b, setB] = useState(""); const [err, setErr] = useState("");
  return <><PageHeader title="Notifications" sub="In-app today. Email, SMS and push channels plug into the same notification table later." />
    <Card className="max-w-xl"><form noValidate className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (t.trim().length < 3 || b.trim().length < 3) return setErr("Add a title and a message"); setErr(""); update((s) => ({ ...s, audit: [{ at: new Date().toISOString(), action: `Broadcast notification: ${t}` }, ...s.audit] })); toast("Notification queued"); setT(""); setB(""); }}>
      <Field label="Title">{(id) => <input id={id} className={inputCls} value={t} onChange={(e) => setT(e.target.value)} />}</Field><Field label="Message">{(id) => <textarea id={id} rows={3} className={inputCls} value={b} onChange={(e) => setB(e.target.value)} />}</Field>{err && <p role="alert" className="text-sm text-error">{err}</p>}<Button type="submit">Send to all students</Button></form></Card></>; }

"use client";
import { useState } from "react";
import { Button, Field, inputCls, useToast } from "../../../components/ui";
export default function P() {
  const toast = useToast(); const [sent, setSent] = useState(false); const [err, setErr] = useState<Record<string, string>>({});
  return <div className="mx-auto max-w-xl px-4 py-12"><h1 className="text-3xl font-bold">Contact us</h1><p className="mt-2 text-muted">Questions, feedback or partnership ideas? Send us a message.</p>
    {sent ? <p role="status" className="mt-6 rounded-card bg-success/15 p-4 text-success">Thank you. We will reply by email.</p> :
    <form noValidate className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const er: Record<string, string> = {};
      if (String(f.get("name")).trim().length < 2) er.name = "Enter your name"; if (!/^\S+@\S+\.\S+$/.test(String(f.get("email")))) er.email = "Enter a valid email"; if (String(f.get("message")).trim().length < 10) er.message = "Write at least 10 characters";
      setErr(er); if (!Object.keys(er).length) { setSent(true); toast("Message sent"); } }}>
      <Field label="Name" error={err.name}>{(id, a) => <input id={id} name="name" className={inputCls} {...a} />}</Field>
      <Field label="Email" error={err.email}>{(id, a) => <input id={id} name="email" type="email" className={inputCls} {...a} />}</Field>
      <Field label="Message" error={err.message}>{(id, a) => <textarea id={id} name="message" rows={5} className={inputCls} {...a} />}</Field>
      <Button type="submit">Send message</Button></form>}</div>; }

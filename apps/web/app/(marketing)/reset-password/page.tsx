"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, Field, inputCls } from "../../../components/ui";
export default function P() {
  const [done, setDone] = useState(false); const [err, setErr] = useState<Record<string, string>>({});
  return <div className="mx-auto max-w-md px-4 py-12"><Card><h1 className="text-2xl font-bold">Choose a new password</h1>
    {done ? <p role="status" className="mt-4 text-sm">Password updated. <Link href="/login" className="text-primary underline">Log in</Link></p> :
    <form noValidate className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const p = String(f.get("password")), c = String(f.get("confirm")); const er: Record<string, string> = {};
      if (p.length < 10 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) er.password = "Use at least 10 characters with a letter and a number"; if (p !== c) er.confirm = "Passwords do not match"; setErr(er); if (!Object.keys(er).length) setDone(true); }}>
      <Field label="New password" error={err.password}>{(id, a) => <input id={id} name="password" type="password" autoComplete="new-password" className={inputCls} {...a} />}</Field>
      <Field label="Confirm password" error={err.confirm}>{(id, a) => <input id={id} name="confirm" type="password" autoComplete="new-password" className={inputCls} {...a} />}</Field>
      <Button type="submit" className="w-full">Update password</Button></form>}</Card></div>; }

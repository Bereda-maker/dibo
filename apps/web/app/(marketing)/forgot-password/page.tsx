"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Card, Field, inputCls } from "../../../components/ui";
export default function P() {
  const [sent, setSent] = useState(false); const [err, setErr] = useState("");
  return <div className="mx-auto max-w-md px-4 py-12"><Card><h1 className="text-2xl font-bold">Reset your password</h1>
    {sent ? <p role="status" className="mt-4 text-sm">If an account exists for that email, we have sent a reset link. It expires in one hour.</p> :
    <form noValidate className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get("email")); if (!/^\S+@\S+\.\S+$/.test(v)) return setErr("Enter a valid email address"); setSent(true); }}>
      <Field label="Email" error={err}>{(id, a) => <input id={id} name="email" type="email" className={inputCls} {...a} />}</Field><Button type="submit" className="w-full">Send reset link</Button></form>}
    <p className="mt-4 text-sm"><Link href="/login" className="text-primary underline">Back to log in</Link></p></Card></div>; }

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema } from "@dibora/validation";
import { Button, Card, Field, inputCls } from "../../../components/ui";
import { useStore, type User } from "../../../lib/store";

export const demoUser = (role: User["role"]): User => ({ name: role === "ADMIN" ? "Admin User" : "Abel Tesfaye", email: role === "ADMIN" ? "admin@dibora.et" : "abel@example.com", phone: "0911223344", school: "Addis Ababa Science School", region: "Addis Ababa", city: "Addis Ababa", grade: 12, stream: "Natural Science", examYear: 2027, subjects: ["math", "phy", "chem", "bio", "eng"], role, plan: "FREE", leaderboardOptIn: false, learningStatus: "DIAGNOSTIC_PENDING" });

export default function Login() {
  const { state, update } = useStore(); const router = useRouter(); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const enter = (u: User) => { update((s) => ({ ...s, user: s.user && s.user.role === u.role ? s.user : u })); router.push(u.role === "ADMIN" ? "/admin" : "/dashboard"); };
  return <div className="mx-auto max-w-md px-4 py-12"><Card><h1 className="text-2xl font-bold">Welcome back</h1>
    <form noValidate className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const r = loginSchema.safeParse({ email: f.get("email"), password: f.get("password") });
      if (!r.success) { const fe = r.error.flatten().fieldErrors; setErr({ email: fe.email?.[0] ? "Enter a valid email address" : "", password: fe.password?.[0] ? "Enter your password" : "" }); return; }
      setErr({}); setBusy(true); setTimeout(() => { setBusy(false); const u = state.user; if (u && u.email === r.data.email) enter(u); else setErr({ form: "No account found on this device. Register first, or use a demo account below." }); }, 400); }}>
      <Field label="Email" error={err.email}>{(id, a) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} {...a} />}</Field>
      <Field label="Password" error={err.password}>{(id, a) => <input id={id} name="password" type="password" autoComplete="current-password" className={inputCls} {...a} />}</Field>
      {err.form && <p role="alert" className="text-sm text-error">{err.form}</p>}
      <Button type="submit" loading={busy} className="w-full">Log in</Button></form>
    <p className="mt-4 text-sm"><Link href="/forgot-password" className="text-primary underline">Forgot password?</Link> · <Link href="/register" className="text-primary underline">Create account</Link></p>
    <div className="mt-6 border-t border-border pt-4"><p className="text-xs text-muted">Demo mode (no server): explore with a sample account.</p>
      <div className="mt-2 flex gap-2"><Button variant="secondary" onClick={() => enter(demoUser("STUDENT"))}>Demo student</Button><Button variant="secondary" onClick={() => enter(demoUser("ADMIN"))}>Demo admin</Button></div></div></Card></div>; }

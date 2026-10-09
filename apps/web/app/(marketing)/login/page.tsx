"use client";

import { DEMO } from "../../../lib/config";
import { AuthLayout } from "../../../components/AuthLayout";
import { DemoAuthMethodChoice, LiveLogin } from "../../../features/live/AuthForms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema } from "@dibora/validation";
import { Button, Card, Field, inputCls } from "../../../components/ui";
import { useStore, type User } from "../../../lib/store";

export const demoUser = (role: User["role"]): User => ({
  name: role === "ADMIN" ? "Admin User" : "Abel Tesfaye",
  email: role === "ADMIN" ? "admin@dibora.et" : "abel@example.com",
  phone: "0911223344",
  school: "Addis Ababa Science School",
  region: "Addis Ababa",
  city: "Addis Ababa",
  grade: 12,
  stream: "Natural Science",
  examYear: 2027,
  subjects: ["math", "phy", "chem", "bio", "eng"],
  role,
  plan: "FREE",
  leaderboardOptIn: false,
  learningStatus: "DIAGNOSTIC_PENDING",
});

function DemoLogin() {
  const { state, update } = useStore();
  const router = useRouter();
  const [error, setError] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const enter = (user: User) => {
    update((current) => ({ ...current, user: current.user && current.user.role === user.role ? current.user : user }));
    router.push(user.role === "ADMIN" ? "/admin" : "/dashboard");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <Card>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <form noValidate className="mt-5 space-y-4" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
          if (!result.success) {
            const fields = result.error.flatten().fieldErrors;
            setError({ email: fields.email?.[0] ? "Enter a valid email address" : "", password: fields.password?.[0] ? "Enter your password" : "" });
            return;
          }
          setError({});
          setBusy(true);
          setTimeout(() => {
            setBusy(false);
            const user = state.user;
            if (user && user.email === result.data.email) enter(user);
            else setError({ form: "No account found on this device. Register first, or use a demo account below." });
          }, 400);
        }}>
          <Field label="Email" error={error.email}>{(id, attributes) => <input id={id} name="email" type="email" autoComplete="email" className={inputCls} {...attributes} />}</Field>
          <Field label="Password" error={error.password}>{(id, attributes) => <input id={id} name="password" type="password" autoComplete="current-password" className={inputCls} {...attributes} />}</Field>
          {error.form && <p role="alert" className="text-sm text-error">{error.form}</p>}
          <Button type="submit" loading={busy} className="w-full">Log in</Button>
        </form>
        <p className="mt-4 text-sm"><Link href="/forgot-password" className="text-primary underline">Forgot password?</Link> · <Link href="/register" className="text-primary underline">Create account</Link></p>
        <div className="mt-6 border-t border-border pt-4"><p className="text-xs text-muted">Demo mode (no server): explore with a sample account.</p>
          <div className="mt-2 flex gap-2"><Button variant="secondary" onClick={() => enter(demoUser("STUDENT"))}>Demo student</Button><Button variant="secondary" onClick={() => enter(demoUser("ADMIN"))}>Demo admin</Button></div>
        </div>
      </Card>
    </div>
  );
}

export default function Page() {
  return <AuthLayout mode="login">{DEMO ? <DemoAuthMethodChoice label="Choose how to sign in"><DemoLogin /></DemoAuthMethodChoice> : <LiveLogin />}</AuthLayout>;
}

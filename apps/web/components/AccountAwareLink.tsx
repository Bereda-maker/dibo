"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { DEMO } from "../lib/config";
import { useSession } from "../lib/session";
import { useStore } from "../lib/store";

type AccountAwareLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  loginHref?: string;
};

/** Keeps public-site calls to action in the signed-in student's learning space. */
export function AccountAwareLink({ loginHref = "/login", ...props }: AccountAwareLinkProps) {
  const session = useSession();
  const store = useStore();
  const role = DEMO ? store.state.user?.role ?? null : session.role;
  const ready = DEMO ? store.ready : session.ready;
  const destination = role === "STUDENT"
    ? "/dashboard"
    : role === "ADMIN" || role === "SUPER_ADMIN"
      ? "/admin"
      : ready
        ? loginHref
        : "/dashboard";

  return <Link {...props} href={destination} />;
}

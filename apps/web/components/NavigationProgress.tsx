"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "dibora:navigation-start";
const FINISH_EVENT = "dibora:navigation-finish";

export function startNavigationProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START_EVENT));
}

export function finishNavigationProgress() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FINISH_EVENT));
}

function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = `${pathname}?${searchParams.toString()}`;
  const previousRoute = useRef<string | null>(null);
  const active = useRef(false);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(0);

  const clearTimers = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    interval.current = null;
    hideTimeout.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    active.current = true;
    setVisible(true);
    setValue((current) => Math.max(current, 12));
    interval.current = setInterval(() => {
      setValue((current) => Math.min(90, current + Math.max(1, (90 - current) * 0.12)));
    }, 170);
  }, [clearTimers]);

  const finish = useCallback(() => {
    if (!active.current) return;
    clearTimers();
    setValue(100);
    hideTimeout.current = setTimeout(() => {
      active.current = false;
      setVisible(false);
      setValue(0);
      hideTimeout.current = null;
    }, 240);
  }, [clearTimers]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${destination.pathname}${destination.search}`;
      if (next === current || (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash)) return;
      start();
    };
    const onPopState = () => start();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(START_EVENT, start);
    window.addEventListener(FINISH_EVENT, finish);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(START_EVENT, start);
      window.removeEventListener(FINISH_EVENT, finish);
      clearTimers();
    };
  }, [clearTimers, finish, start]);

  useEffect(() => {
    if (previousRoute.current === null) {
      previousRoute.current = route;
      return;
    }
    if (previousRoute.current !== route) finish();
    previousRoute.current = route;
  }, [finish, route]);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-hidden={!visible}
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_65%,transparent)] transition-[width] duration-200 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return <Suspense fallback={null}><ProgressBar /></Suspense>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setAnimate(true);
    const timeout = window.setTimeout(() => setAnimate(false), 300);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return (
    <div key={pathname} className={animate ? "page-transition-enter" : undefined}>
      {children}
    </div>
  );
}

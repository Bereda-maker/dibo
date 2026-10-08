"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "../lib/i18n";

const SCRUB_SENSITIVITY = 0.8;

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);
    let index = 0;
    let interval: number | undefined;
    const delay = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          if (interval !== undefined) window.clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(delay);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

export function DiboraHero() {
  const t = useT();
  const headline = t("hero.title");
  const description = t("hero.body");
  const { displayed, done } = useTypewriter(description);
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const pointerTarget = useRef({ x: 0.5, y: 0.5 });
  const pointerFrame = useRef<number | null>(null);
  const previousX = useRef<number | null>(null);
  const pendingTime = useRef<number | null>(null);
  const seeking = useRef(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setActionsVisible(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {\n    const video = videoRef.current;\n    const hero = heroRef.current;\n    if (!video || !hero) return;\n    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");\n\n    const onMouseMove = (event: MouseEvent) => {\n      if (!reduceMotion.matches) {\n        const bounds = hero.getBoundingClientRect();\n        if (bounds.width > 0 && bounds.height > 0) {\n          pointerTarget.current = {\n            x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),\n            y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),\n          };\n\n          if (pointerFrame.current === null) {\n            pointerFrame.current = window.requestAnimationFrame(() => {\n              const { x, y } = pointerTarget.current;\n              video.style.transition = "none";\n              video.style.transform = "translate3d(" + ((0.5 - x) * 14).toFixed(1) + "px, " + ((0.5 - y) * 8).toFixed(1) + "px, 0) scale(1.06)";\n              spotlightRef.current?.style.setProperty("--spotlight-x", (x * 100).toFixed(1) + "%");\n              spotlightRef.current?.style.setProperty("--spotlight-y", (y * 100).toFixed(1) + "%");\n              spotlightRef.current?.style.setProperty("opacity", "1");\n              pointerFrame.current = null;\n            });\n          }\n        }\n      }\n\n      if (!Number.isFinite(video.duration) || video.duration <= 0) return;\n      if (previousX.current === null) {\n        previousX.current = event.clientX;\n        return;\n      }\n\n      const delta = event.clientX - previousX.current;\n      previousX.current = event.clientX;\n      if (delta === 0) return;\n\n      const baseTime = pendingTime.current ?? video.currentTime;\n      const width = Math.max(window.innerWidth, 1);\n      const target = Math.max(\n        0,\n        Math.min(\n          video.duration,\n          baseTime + (delta / width) * SCRUB_SENSITIVITY * video.duration,\n        ),\n      );\n      pendingTime.current = target;\n\n      if (!seeking.current) {\n        if (Math.abs(video.currentTime - target) < 0.01) {\n          pendingTime.current = null;\n          return;\n        }\n        seeking.current = true;\n        video.currentTime = target;\n      }\n    };\n\n    const onMouseLeave = () => {\n      previousX.current = null;\n      if (pointerFrame.current !== null) {\n        window.cancelAnimationFrame(pointerFrame.current);\n        pointerFrame.current = null;\n      }\n      spotlightRef.current?.style.setProperty("opacity", "0");\n      if (!reduceMotion.matches) {\n        video.style.transition = "transform 650ms cubic-bezier(.22,1,.36,1)";\n        video.style.transform = "translate3d(0,0,0) scale(1.06)";\n      }\n    };\n\n    const onSeeked = () => {\n      const target = pendingTime.current;\n      if (target !== null && Math.abs(target - video.currentTime) > 0.03) {\n        video.currentTime = target;\n        return;\n      }\n      pendingTime.current = null;\n      seeking.current = false;\n    };\n\n    hero.addEventListener("mousemove", onMouseMove, { passive: true });\n    hero.addEventListener("mouseleave", onMouseLeave);\n    video.addEventListener("seeked", onSeeked);\n    return () => {\n      hero.removeEventListener("mousemove", onMouseMove);\n      hero.removeEventListener("mouseleave", onMouseLeave);\n      video.removeEventListener("seeked", onSeeked);\n      if (pointerFrame.current !== null) window.cancelAnimationFrame(pointerFrame.current);\n    };\n  }, []);

  return (
    <section
      ref={heroRef}
      aria-labelledby="dibora-hero-title"
      className="relative isolate flex min-h-[calc(100svh-7rem)] flex-col justify-end overflow-hidden bg-black px-5 pb-12 text-white md:min-h-[calc(100svh-4rem)] md:justify-center md:px-10 md:pb-0"
    >
      <video
        ref={videoRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-cover object-[70%_center]"
        src="/videos/dibora-farm-hero.mp4"
        poster="/images/dibora-farm-poster.jpg"
        muted
        playsInline
        preload="auto"
        tabIndex={-1}
        style={{ transform: "translate3d(0,0,0) scale(1.06)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.48) 0%, rgba(0,0,0,.24) 52%, rgba(0,0,0,.05) 100%), linear-gradient(0deg, rgba(0,0,0,.28) 0%, transparent 66%)",
        }}
      />

      <div
        ref={spotlightRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-500 ease-out motion-reduce:transition-none"
        style={{
          background:
            "radial-gradient(460px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(255,255,255,.16), transparent 72%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border border-white/30 bg-black/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            {t("hero.eyebrow")}
          </p>
          <h1
            id="dibora-hero-title"
            className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl"
          >
            {headline}
          </h1>
          <p
            aria-label={description}
            className="mt-5 min-h-[6.5rem] max-w-2xl text-lg leading-relaxed text-white/95 sm:text-xl"
          >
            <span aria-hidden="true">
              {displayed}
              {!done && (
                <span className="ml-1 inline-block h-[1.1em] w-[2px] animate-pulse bg-white align-middle motion-reduce:animate-none" />
              )}
            </span>
            <span className="sr-only">{description}</span>
          </p>
          <div
            aria-hidden={!actionsVisible}
            className={`mt-6 flex flex-wrap gap-3 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${actionsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
            style={{ pointerEvents: actionsVisible ? "auto" : "none" }}
          >
            <Link
              href="/register"
              tabIndex={actionsVisible ? undefined : -1}
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-[transform,background-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:bg-primary-light hover:shadow-xl active:translate-y-0 active:scale-[0.98] focus-visible:outline-white motion-reduce:transform-none motion-reduce:transition-none"
            >
              {t("cta.start")}
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </Link>
            <Link
              href="/features"
              tabIndex={actionsVisible ? undefined : -1}
              className="group inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/10 px-6 py-3 font-semibold text-white shadow-sm backdrop-blur-sm transition-[transform,background-color,box-shadow,color] duration-300 ease-out hover:-translate-y-1 hover:bg-white hover:text-primary hover:shadow-xl active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
            >
              {t("cta.explore")}
              <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

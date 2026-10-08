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
  const previousX = useRef<number | null>(null);
  const pendingTime = useRef<number | null>(null);
  const seeking = useRef(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setActionsVisible(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onMouseMove = (event: MouseEvent) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      if (previousX.current === null) {
        previousX.current = event.clientX;
        return;
      }

      const delta = event.clientX - previousX.current;
      previousX.current = event.clientX;
      if (delta === 0) return;

      const baseTime = pendingTime.current ?? video.currentTime;
      const width = Math.max(window.innerWidth, 1);
      const target = Math.max(
        0,
        Math.min(
          video.duration,
          baseTime + (delta / width) * SCRUB_SENSITIVITY * video.duration,
        ),
      );
      pendingTime.current = target;

      if (!seeking.current) {
        if (Math.abs(video.currentTime - target) < 0.01) {
          pendingTime.current = null;
          return;
        }
        seeking.current = true;
        video.currentTime = target;
      }
    };

    const onSeeked = () => {
      const target = pendingTime.current;
      if (target !== null && Math.abs(target - video.currentTime) > 0.03) {
        video.currentTime = target;
        return;
      }
      pendingTime.current = null;
      seeking.current = false;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    video.addEventListener("seeked", onSeeked);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      video.removeEventListener("seeked", onSeeked);
    };
  }, []);

  return (
    <section
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
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.48) 0%, rgba(0,0,0,.24) 52%, rgba(0,0,0,.05) 100%), linear-gradient(0deg, rgba(0,0,0,.28) 0%, transparent 66%)",
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
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-primary-light focus-visible:outline-white"
            >
              {t("cta.start")}
            </Link>
            <Link
              href="/features"
              tabIndex={actionsVisible ? undefined : -1}
              className="rounded-xl border border-white/70 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-primary"
            >
              {t("cta.explore")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

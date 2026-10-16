"use client";

import { Suspense } from "react";
import { DEMO } from "../../../lib/config";
import { LiveAssistant } from "../../../features/assistant/LiveAssistant";
import { DemoAssistant } from "../../../features/assistant/DemoAssistant";

function AssistantFallback() {
  return <div aria-busy="true" aria-label="Loading assistant" className="grid h-dvh min-h-[500px] place-items-center bg-bg p-6 text-sm text-muted"><span className="animate-pulse motion-reduce:animate-none">Loading Deborah Study Assistant…</span></div>;
}

export default function Page() {
  return <Suspense fallback={<AssistantFallback />}>{DEMO ? <DemoAssistant /> : <LiveAssistant />}</Suspense>;
}

"use client";
import { DEMO } from "../../../lib/config";
import { LiveDiagnostic } from "../../../features/live/Pages";
import { ExamRunner } from "../../../components/ExamRunner";
function DemoP() { return <ExamRunner examId="diag" />; }

export default function Page() { return DEMO ? <DemoP /> : <LiveDiagnostic />; }

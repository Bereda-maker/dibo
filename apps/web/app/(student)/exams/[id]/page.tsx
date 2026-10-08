"use client";
import { DEMO } from "../../../../lib/config";
import { LiveExamRoute } from "../../../../features/live/Pages";
import { useParams } from "next/navigation";
import { ExamRunner } from "../../../../components/ExamRunner";
function DemoP() { const { id } = useParams<{ id: string }>(); return <ExamRunner examId={id} />; }

export default function Page() { return DEMO ? <DemoP /> : <LiveExamRoute />; }

"use client";
import { useParams } from "next/navigation";
import { ExamRunner } from "../../../../components/ExamRunner";
export default function P() { const { id } = useParams<{ id: string }>(); return <ExamRunner examId={id} />; }

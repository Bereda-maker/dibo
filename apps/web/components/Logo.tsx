import Link from "next/link";
import { APP_NAME } from "./Controls";
export function Logo() { return <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-primary"><span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm text-accent">D</span>{APP_NAME}</Link>; }

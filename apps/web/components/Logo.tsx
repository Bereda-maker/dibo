import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "./Controls";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Dibora home"
      className="group flex min-w-0 items-center gap-2.5 rounded-2xl"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-accent/25 bg-white shadow-sm transition-all duration-300 group-hover:-rotate-2 group-hover:shadow-md group-hover:ring-2 group-hover:ring-accent/20">
        <Image
          src="/images/dibora-logo.png"
          alt=""
          aria-hidden="true"
          width={96}
          height={96}
          priority
          className="h-full w-full object-contain"
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[1.15rem] font-extrabold tracking-tight text-primary transition-colors group-hover:text-primary-light sm:text-xl">
          {APP_NAME}
        </span>
        <span className="hidden text-[0.58rem] font-bold uppercase tracking-[0.13em] text-muted min-[440px]:block">
          Learn · Grow · Achieve
        </span>
      </span>
    </Link>
  );
}

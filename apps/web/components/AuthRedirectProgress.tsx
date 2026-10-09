import { LoaderCircle } from "lucide-react";

export function AuthRedirectProgress({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15">
        <div className="auth-redirect-progress h-full w-1/3 rounded-full bg-primary" />
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
        <div role="status" aria-live="polite" aria-atomic="true" className="flex max-w-sm items-center gap-2.5 rounded-full border border-border/80 bg-surface/95 px-4 py-2 text-sm font-medium text-text shadow-lg shadow-primary/10 backdrop-blur">
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <span>{message}</span>
        </div>
      </div>
    </>
  );
}

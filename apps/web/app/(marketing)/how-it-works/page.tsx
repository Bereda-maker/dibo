export const metadata = { title: "How it works" };
const steps = ["Create Account", "Complete Profile", "Take Diagnostic Assessment", "Discover Weak Areas", "Study", "Practice", "Take Mock Exams", "Analyze Results", "Improve"];
export default function P() { return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl font-bold">How it works</h1>
  <ol className="mt-8 space-y-3">{steps.map((s, i) => <li key={s} className="flex items-center gap-4 rounded-card border border-border bg-surface p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-bold text-white">{i + 1}</span><span className="font-semibold">{s}</span></li>)}</ol></div>; }

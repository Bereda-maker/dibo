import { AlertCircle, Bot, ShieldCheck } from "lucide-react";
import { Card, PageHeader } from "../../../components/ui";

export default function Page() {
  return <>
    <PageHeader title="AI management" sub="The study assistant uses server-side provider configuration. Provider secrets and private student conversations are not exposed in this console." />
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Bot size={20} aria-hidden="true" /></span>
          <div><h2 className="font-bold">Provider configuration</h2><p className="mt-1 text-sm leading-6 text-muted">Set these values in the API deployment environment. Values are intentionally not read back into the browser.</p></div>
        </div>
        <dl className="mt-5 divide-y divide-border text-sm">
          <div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted">Provider key</dt><dd><code>AI_PROVIDER_API_KEY</code> · server only</dd></div>
          <div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted">Optional endpoint</dt><dd><code>AI_BASE_URL</code></dd></div>
          <div className="flex flex-wrap justify-between gap-2 py-3"><dt className="text-muted">Optional model</dt><dd><code>AI_MODEL</code></dd></div>
        </dl>
      </Card>
      <Card>
        <div className="flex items-start gap-3"><span className="rounded-xl bg-success/10 p-2.5 text-success"><ShieldCheck size={20} aria-hidden="true" /></span><div><h2 className="font-bold">Privacy and safety</h2><p className="mt-1 text-sm leading-6 text-muted">The API screens prompt-injection attempts, sanitizes user input and model output, and keeps provider credentials on the server. Analytics provides a basic count of student AI messages, not conversation content.</p></div></div>
        <div className="mt-5 rounded-xl border border-border bg-bg p-4"><p className="text-sm font-semibold">Conversation review</p><p className="mt-1 text-sm leading-6 text-muted">Student conversations are private and are not displayed here. This console does not currently provide an authorized support or safety review workflow.</p></div>
      </Card>
      <Card className="lg:col-span-2">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-warning/10 p-2.5 text-warning"><AlertCircle size={20} aria-hidden="true" /></span><div><h2 className="font-bold">Detailed usage analytics unavailable</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">Latency, failure rates, token costs, student feedback, and per-plan usage limits are not currently provided by the admin API. No sample values are shown. Add server-side usage instrumentation before treating those figures as operational metrics.</p></div></div>
      </Card>
    </div>
  </>;
}

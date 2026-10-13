import { and, eq, inArray } from "drizzle-orm";
import { adminAuditLogs, authIdentities, notifications, users, type Db } from "@dibora/database";
import type { ManualReview } from "./payments/payment.service";

type Config = { telegramBotToken?: string; telegramAdminChatIds?: string[] };

/** Alerts are best-effort: a notification outage must never reject a student's receipt submission. */
export class ManualReviewNotifier {
  constructor(private db: Db, private config: Config = {}) {}

  async notify(review: ManualReview) {
    await this.notifyInApp(review).catch((error) => console.error(JSON.stringify({ level: "error", msg: "manual review in-app notification failed", kind: error instanceof Error ? error.name : "UNKNOWN" })));
    await this.notifyTelegram(review).catch((error) => console.error(JSON.stringify({ level: "error", msg: "manual review Telegram notification failed", kind: error instanceof Error ? error.name : "UNKNOWN" })));
  }

  private async notifyInApp(review: ManualReview) {
    const admins = await this.db.select({ id: users.id }).from(users).where(and(inArray(users.role, ["ADMIN", "SUPER_ADMIN"]), eq(users.isActive, true)));
    if (!admins.length) return;
    const title = "New payment receipt needs review";
    const body = `${review.studentName} submitted ${review.currency} ${(review.amountMinor / 100).toLocaleString("en-US")} via ${review.paymentMethod ?? "an unknown method"}. Verify.et could not process it.`;
    await this.db.insert(notifications).values(admins.map((admin) => ({ userId: admin.id, type: "PAYMENT_REVIEW", channel: "IN_APP", title, body, data: { paymentId: review.id, reference: review.reference } })));
  }

  private async notifyTelegram(review: ManualReview) {
    const ids = this.config.telegramAdminChatIds ?? [];
    if (!this.config.telegramBotToken || !ids.length) return;
    const text = [
      "<b>Deborah payment review required</b>",
      `Student: ${escapeHtml(review.studentName)}`,
      `Amount: ${escapeHtml(review.currency)} ${(review.amountMinor / 100).toLocaleString("en-US")}`,
      `Method: ${escapeHtml(review.paymentMethod ?? "Unknown")}`,
      review.transactionReference ? `Reference: ${escapeHtml(review.transactionReference)}` : null,
      `Payment: <code>${escapeHtml(review.reference)}</code>`,
      "Open the Deborah admin dashboard to view the private receipt and review it.",
    ].filter(Boolean).join("\n");
    for (const chatId of ids) {
      const response = await fetch(`https://api.telegram.org/bot${this.config.telegramBotToken}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }) });
      if (!response.ok) throw new Error(`Telegram returned ${response.status}`);
    }
  }
}

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

const approvedBody = (name: string) => `Hello, ${name.trim() || "Student"}! 👋

Great news! Your payment has been successfully verified and approved by the Deborah team.

Your payment is confirmed, and your account access has been activated. You can now enjoy your learning resources, practice exam questions, and continue preparing for your Grade 12 national exams.

Thank you for choosing Deborah. We're proud to be part of your learning journey!

Keep learning, keep practicing, and keep moving toward your goals. 💚

— The Deborah Team`;

export const paymentApprovedNotification = (name: string) => ({
  type: "SUBSCRIPTION",
  channel: "IN_APP",
  title: "🎉 Payment Approved!",
  body: approvedBody(name),
  data: { event: "PAYMENT_APPROVED" },
});

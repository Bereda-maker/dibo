const welcomeBody = (name: string) => `Hello, ${name.trim() || "Student"}! 👋

Welcome to Deborah, your learning companion for Grade 12 success!

We're excited to have you here. Deborah is designed to help you learn smarter, strengthen your understanding of challenging subjects, practice exam questions, and prepare confidently for your national exams.

Here, every question is an opportunity to learn, every practice session brings you closer to your goals, and every step forward matters.

Your journey to success starts today. Stay curious, keep practicing, and believe in your potential. We're here to support you along the way.

Let's make your learning journey meaningful and your dreams achievable!

— The Deborah Team 💚`;

export const welcomeNotification = (name: string) => ({
  type: "WELCOME",
  channel: "IN_APP",
  title: "🎓 Welcome to Deborah!",
  body: welcomeBody(name),
  data: { audience: "NEW_STUDENT" },
});

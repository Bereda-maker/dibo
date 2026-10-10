import { Hono } from "hono";
import { contactMessages, type Db } from "@dibora/database";
import { contactMessageSchema } from "@dibora/validation";
import { rateLimit } from "../middleware/rate-limit";
import { v as zValidator } from "../utils/validate";
import { ok } from "../utils/response";

export const contactRoutes = (db: Db) => {
  const r = new Hono();
  r.post(
    "/",
    rateLimit({ limit: 5, windowMs: 60_000, prefix: "contact" }),
    zValidator("json", contactMessageSchema),
    async (c) => {
      const input = c.req.valid("json");
      // Return a normal success response for the hidden field, but do not store bot submissions.
      if (input.website) return ok(c, { received: true }, 201);
      const [saved] = await db.insert(contactMessages).values({ name: input.name, email: input.email, message: input.message }).returning({ id: contactMessages.id });
      return ok(c, { received: true, id: saved!.id }, 201);
    },
  );
  return r;
};

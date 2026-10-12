import { beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { resolve } from "node:path";
import * as s from "@dibora/database/schema";
import type { Db } from "@dibora/database";
import { adminRoutes } from "../src/routes/admin";
import { errorHandler } from "../src/middleware/error-handler";
import type { AuthContext } from "../src/middleware/auth";
import { AdminService } from "../src/services/admin.service";
import { calculateRevenueAllocation, monthRangeEAT } from "../src/services/finance-allocation";
import type { AdminService as AdminServiceType } from "../src/services/admin.service";

const sumOwner = (result: ReturnType<typeof calculateRevenueAllocation>) => result.ownerAllocations.reduce((sum, item) => sum + item.amountMinor, 0);

describe("finance allocation math", () => {
  test("allocates a round amount using the specified 10/90 and owner-plan percentages", () => {
    const result = calculateRevenueAllocation(10_000);
    expect(result.godMinor).toBe(1_000);
    expect(result.ownerMinor).toBe(9_000);
    expect(result.ownerAllocations.map((item) => item.amountMinor)).toEqual([2_700, 2_700, 1_350, 900, 900, 450]);
    expect(sumOwner(result)).toBe(result.ownerMinor);
    expect(result.godMinor + result.ownerMinor).toBe(result.grossMinor);
  });

  test("distributes rounding remainders without losing any minor units", () => {
    for (const gross of [0, 1, 5, 101, 9_999, 1_000_001]) {
      const result = calculateRevenueAllocation(gross);
      expect(result.godMinor + result.ownerMinor).toBe(gross);
      expect(sumOwner(result)).toBe(result.ownerMinor);
    }
  });

  test("uses Addis Ababa local-month boundaries (UTC+03:00)", () => {
    const range = monthRangeEAT("2026-10");
    expect(range.start.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(() => monthRangeEAT("2026-13")).toThrow();
  });
});

describe("finance route access", () => {
  const fakeAdmin = { monthlyFinance: async (month: string) => ({ month, timeZone: "Africa/Addis_Ababa", currencies: [] }) } as unknown as AdminServiceType;
  const makeApp = (role: "ADMIN" | "SUPER_ADMIN") => {
    const app = new Hono<{ Variables: { auth: AuthContext } }>();
    app.use("*", async (c, next) => { c.set("auth", { userId: "test", sessionId: "test", role }); await next(); });
    app.route("/api/admin", adminRoutes(fakeAdmin));
    app.onError(errorHandler);
    return app;
  };

  test("allows super-admin and denies admin", async () => {
    const superAdminResponse = await makeApp("SUPER_ADMIN").request("/api/admin/finance?month=2026-10");
    expect(superAdminResponse.status).toBe(200);
    const adminResponse = await makeApp("ADMIN").request("/api/admin/finance?month=2026-10");
    expect(adminResponse.status).toBe(403);
  });

  test("rejects an invalid month before querying the service", async () => {
    const response = await makeApp("SUPER_ADMIN").request("/api/admin/finance?month=2026-13");
    expect(response.status).toBe(400);
  });
});

const financeRaw = drizzle(new PGlite(), { schema: s });
const financeDb = financeRaw as unknown as Db;
let financeUserId = "";
beforeAll(async () => {
  await migrate(financeRaw, { migrationsFolder: resolve(import.meta.dir, "../../../packages/database/migrations") });
  const [user] = await financeRaw.insert(s.users).values({ email: "finance-test@example.test", passwordHash: "test" }).returning({ id: s.users.id });
  financeUserId = user!.id;
  await financeRaw.insert(s.payments).values([
    { userId: financeUserId, amountMinor: 20_000, currency: "ETB", provider: "test", reference: "fin-in-start", status: "VERIFIED", verifiedAt: new Date("2026-09-30T21:00:00.000Z") },
    { userId: financeUserId, amountMinor: 30_000, currency: "ETB", provider: "test", reference: "fin-in-end", status: "VERIFIED", verifiedAt: new Date("2026-10-31T20:59:59.999Z") },
    { userId: financeUserId, amountMinor: 90_000, currency: "ETB", provider: "test", reference: "fin-out-end", status: "VERIFIED", verifiedAt: new Date("2026-10-31T21:00:00.000Z") },
    { userId: financeUserId, amountMinor: 80_000, currency: "ETB", provider: "test", reference: "fin-pending", status: "PENDING", verifiedAt: new Date("2026-10-15T09:00:00.000Z") },
    { userId: financeUserId, amountMinor: 7_500, currency: "USD", provider: "test", reference: "fin-usd", status: "VERIFIED", verifiedAt: new Date("2026-10-15T09:00:00.000Z") },
  ]);
});

describe("monthly finance database aggregation", () => {
  test("includes verified payments in the EAT month, excludes pending/out-of-month rows, and keeps currencies separate", async () => {
    const result = await new AdminService(financeDb).monthlyFinance("2026-10");
    expect(result.timeZone).toBe("Africa/Addis_Ababa");
    expect(result.currencies).toEqual([
      { currency: "ETB", verifiedPaymentCount: 2, grossMinor: 50_000, godMinor: 5_000, ownerMinor: 45_000, ownerAllocations: [
        { key: "essential", sharePercent: 30, amountMinor: 13_500 },
        { key: "reinvestment", sharePercent: 30, amountMinor: 13_500 },
        { key: "emergency", sharePercent: 15, amountMinor: 6_750 },
        { key: "longTerm", sharePercent: 10, amountMinor: 4_500 },
        { key: "learning", sharePercent: 10, amountMinor: 4_500 },
        { key: "enjoyment", sharePercent: 5, amountMinor: 2_250 },
      ] },
      { currency: "USD", verifiedPaymentCount: 1, grossMinor: 7_500, godMinor: 750, ownerMinor: 6_750, ownerAllocations: [
        { key: "essential", sharePercent: 30, amountMinor: 2_025 },
        { key: "reinvestment", sharePercent: 30, amountMinor: 2_025 },
        { key: "emergency", sharePercent: 15, amountMinor: 1_013 },
        { key: "longTerm", sharePercent: 10, amountMinor: 675 },
        { key: "learning", sharePercent: 10, amountMinor: 675 },
        { key: "enjoyment", sharePercent: 5, amountMinor: 337 },
      ] },
    ]);
  });
});

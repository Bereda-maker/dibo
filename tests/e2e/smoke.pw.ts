import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/", "/about", "/features", "/how-it-works", "/pricing", "/faq", "/contact", "/privacy",
  "/login", "/payment/return",
];
test.describe("Dibora public route smoke tests (browser-emulated, demo build)", () => {
  test("public and legacy auth URLs load or resolve to their documented destination", async ({ page }) => {
    test.setTimeout(120_000);
    for (const path of publicRoutes) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      expect(response, `${path} should return a document response`).not.toBeNull();
      expect(response!.status(), `${path} should not return an HTTP error`).toBeLessThan(400);
      await expect(page.locator("body")).not.toBeEmpty();
    }
    for (const path of ["/register", "/forgot-password", "/reset-password"]) {
      await page.goto(path, { waitUntil: "commit", timeout: 30_000 });
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    }
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByText(/provider sign-in is not active in demo mode/i)).toBeVisible();
    await expect(page.getByText(/email and password sign-in are not offered/i)).toBeVisible();
  });

  test("home page exposes Dibora learning journeys and safe login navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Question bank & practice")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timed mock exams" })).toBeVisible();
    const loginLink = page.locator('a[href="/login"]:visible').last();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("group", { name: "Choose a sign-in provider" })).toBeVisible();
  });

  test("unknown route returns a not-found response rather than a broken page", async ({ page }) => {
    const response = await page.goto("/this-dibora-route-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.locator("body")).toContainText(/not found|404/i);
  });
});

test.describe("Dibora responsive smoke tests (viewport emulation only)", () => {
  for (const width of [320, 360, 390, 414, 600, 768, 820, 1024, 1280, 1440, 1920]) {
    test(`home has no horizontal document overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
      expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
    });
  }
});

test.describe("Dibora admin navigation smoke (demo data only)", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("dibora_state_v1", JSON.stringify({ user: { name: "QA Admin", role: "ADMIN" } }));
    });
  });

  test("mobile admin drawer opens and navigates to the question bank", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("button", { name: "Open admin navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Open admin navigation" }).click();
    const nav = page.getByRole("navigation", { name: "Admin console navigation" }).last();
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Question bank" }).click();
    await expect(page).toHaveURL(/\/admin\/questions$/);
    await expect(page.getByRole("heading", { name: "Question bank" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  });
});

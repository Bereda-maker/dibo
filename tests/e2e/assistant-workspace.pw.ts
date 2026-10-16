import { expect, test } from "@playwright/test";

const demoStudentState = {
  user: {
    name: "QA Student",
    email: "qa-student@example.test",
    phone: "",
    school: "Test School",
    region: "Addis Ababa",
    city: "Addis Ababa",
    grade: 12,
    stream: "Natural Science",
    examYear: 2027,
    subjects: [],
    role: "STUDENT",
    plan: "FREE",
    leaderboardOptIn: false,
    learningStatus: "ACTIVE",
  },
  conversations: [],
  aiUsage: {},
};

test.describe("Deborah assistant workspace (demo-mode interaction regression)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((state) => {
      if (!localStorage.getItem("dibora_state_v1")) localStorage.setItem("dibora_state_v1", JSON.stringify(state));
    }, demoStudentState);
  });

  test("mobile drawer, saved study chat actions, desktop collapse, context switching, and responsive transcript work", async ({ page }) => {
    await page.goto("/assistant");
    await expect(page.getByRole("heading", { name: "What would you like to understand today?" })).toBeVisible();
    await expect(page.getByText("Demo mode uses sample study notes; live AI responses are not enabled.")).toBeVisible();

    const dimensionsBefore = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensionsBefore.document).toBeLessThanOrEqual(dimensionsBefore.viewport);

    await page.getByRole("button", { name: "Open assistant navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Assistant navigation" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Physics" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);

    await page.getByLabel("Ask Deborah a question").fill("Explain Newton's second law");
    await page.getByRole("button", { name: "Send message" }).click();
    const transcript = page.getByRole("main", { name: "Study conversation" });
    await expect(transcript.getByRole("heading", { name: "Newton's laws of motion" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Newton's laws of motion" })).toBeVisible();

    await page.getByRole("button", { name: "Mark answer helpful" }).click();
    await expect(page.getByRole("button", { name: "Mark answer helpful" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Generate another answer" }).click();
    await expect(page.getByText("Alternative response")).toBeVisible();
    await expect(transcript.getByText("Explain Newton's second law", { exact: true })).toHaveCount(1);

    await page.getByRole("button", { name: "Open assistant navigation" }).click();
    const openDrawer = page.getByRole("dialog", { name: "Assistant navigation" });
    await expect(openDrawer).toBeVisible();
    const actions = openDrawer.locator('summary[aria-label*="Conversation actions"]');
    await actions.click();
    await openDrawer.getByRole("menuitem", { name: "Save conversation" }).click();
    await openDrawer.getByRole("button", { name: "Saved conversations" }).click();
    await expect(openDrawer.getByText("Explain Newton's second law", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Save answer" }).last().click();
    await expect(page.getByRole("button", { name: "Remove saved answer" })).toHaveAttribute("aria-pressed", "true");
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("dibora_state_v1");
      if (!raw) return false;
      const savedState = JSON.parse(raw);
      return savedState.conversations?.some((conversation: { isSaved?: boolean; messages?: { isSaved?: boolean }[] }) => conversation.isSaved && conversation.messages?.some((message) => message.isSaved));
    });
    await page.reload();
    await page.getByRole("button", { name: "Open assistant navigation" }).click();
    const reloadedDrawer = page.getByRole("dialog", { name: "Assistant navigation" });
    await reloadedDrawer.getByRole("button", { name: "Saved conversations" }).click();
    await reloadedDrawer.getByText("Explain Newton's second law", { exact: true }).click();
    const reloadedTranscript = page.getByRole("main", { name: "Study conversation" });
    await expect(reloadedTranscript.getByRole("heading", { name: "Newton's laws of motion" })).toHaveCount(2);
    await expect(reloadedTranscript.getByText("Alternative response")).toBeVisible();
    await expect(reloadedTranscript.getByText("Explain Newton's second law", { exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Remove saved answer" }).last()).toHaveAttribute("aria-pressed", "true");

    await page.setViewportSize({ width: 1280, height: 900 });
    const desktopSidebar = page.getByRole("complementary", { name: "Assistant navigation" });
    await expect(desktopSidebar).toBeVisible();
    await desktopSidebar.getByRole("button", { name: "Physics" }).click();
    await expect(page.getByLabel("Subject", { exact: true })).toHaveValue("phy");
    await desktopSidebar.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(desktopSidebar.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.getByLabel("Subject", { exact: true }).selectOption("phy");
    const topicSelect = page.getByLabel("Topic");
    await expect(topicSelect).toBeEnabled();
    await topicSelect.selectOption("mech");
    await expect(page.getByText(/Topic: Mechanics/)).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 });
    const tabletDrawerButton = page.getByRole("button", { name: "Open assistant navigation" });
    await expect(tabletDrawerButton).toBeVisible();
    await tabletDrawerButton.click();
    await expect(page.getByRole("dialog", { name: "Assistant navigation" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Assistant navigation" })).toHaveCount(0);
    const tabletPortrait = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(tabletPortrait.document).toBeLessThanOrEqual(tabletPortrait.viewport);

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.getByRole("button", { name: "Open assistant navigation" })).toBeHidden();
    const tabletLandscape = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(tabletLandscape.document).toBeLessThanOrEqual(tabletLandscape.viewport);

    const dimensionsAfter = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    expect(dimensionsAfter.document).toBeLessThanOrEqual(dimensionsAfter.viewport);
    expect(dimensionsAfter.body).toBeLessThanOrEqual(dimensionsAfter.viewport);
  });
});

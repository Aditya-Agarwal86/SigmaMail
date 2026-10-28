import { test, expect } from "@playwright/test";

test.describe("Category Filter Buttons Visibility & Persistence", () => {
  test.beforeEach(async ({ page }) => {
    // baseURL is http://localhost:3000 in config or 3001 if passed
  });

  test("Schools category: all 9 school options remain visible after selection and switching", async ({ page }) => {
    await page.goto("/categories/SCHOOLS");

    // Check School label
    await expect(page.getByText("School:", { exact: false })).toBeVisible();

    const expectedSchools = [
      "All Schools",
      "SCOPE",
      "SENSE",
      "SMEC",
      "SAS",
      "VISH",
      "VSL",
      "VSB",
      "SBST",
    ];

    // 1. All nine options render initially
    for (const school of expectedSchools) {
      await expect(page.getByRole("link", { name: school, exact: true })).toBeVisible();
    }

    // 2. Click SCOPE
    await page.getByRole("link", { name: "SCOPE", exact: true }).click();
    await expect(page).toHaveURL(/.*\/categories\/SCHOOLS\?.*school=SCOPE/);

    // Verify all 9 buttons still visible
    for (const school of expectedSchools) {
      await expect(page.getByRole("link", { name: school, exact: true })).toBeVisible();
    }
    // Verify SCOPE is highlighted
    const scopeBtn = page.getByRole("link", { name: "SCOPE", exact: true });
    await expect(scopeBtn).toHaveClass(/bg-cyan-700/);

    // 3. Click VISH
    await page.getByRole("link", { name: "VISH", exact: true }).click();
    await expect(page).toHaveURL(/.*\/categories\/SCHOOLS\?.*school=VISH/);

    // Verify all 9 buttons still visible
    for (const school of expectedSchools) {
      await expect(page.getByRole("link", { name: school, exact: true })).toBeVisible();
    }
    const vishBtn = page.getByRole("link", { name: "VISH", exact: true });
    await expect(vishBtn).toHaveClass(/bg-cyan-700/);

    // 4. Click All Schools
    await page.getByRole("link", { name: "All Schools", exact: true }).click();
    await expect(page).toHaveURL(/.*\/categories\/SCHOOLS/);

    // Verify all 9 buttons still visible
    for (const school of expectedSchools) {
      await expect(page.getByRole("link", { name: school, exact: true })).toBeVisible();
    }
    const allSchoolsBtn = page.getByRole("link", { name: "All Schools", exact: true });
    await expect(allSchoolsBtn).toHaveClass(/bg-cyan-700/);
  });

  test("CDC & Placement category: all 5 subsection buttons remain visible after selection", async ({ page }) => {
    await page.goto("/categories/CDC_AND_PLACEMENT");

    // Check Section label
    await expect(page.getByText("Section:", { exact: false })).toBeVisible();

    const expectedSubsections = [
      "All Placement",
      "Placement Drives",
      "Drive Updates",
      "Congratulations & Results",
      "Other CDC",
    ];

    // 1. All 5 render initially
    for (const sub of expectedSubsections) {
      await expect(page.getByRole("link", { name: sub, exact: true })).toBeVisible();
    }

    // 2. Click Placement Drives
    await page.getByRole("link", { name: "Placement Drives", exact: true }).click();
    await expect(page).toHaveURL(/.*\/categories\/CDC_AND_PLACEMENT\?.*subCategory=PLACEMENT_DRIVE/);

    for (const sub of expectedSubsections) {
      await expect(page.getByRole("link", { name: sub, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Placement Drives", exact: true })).toHaveClass(/bg-amber-600/);

    // 3. Click Congratulations & Results
    await page.getByRole("link", { name: "Congratulations & Results", exact: true }).click();
    await expect(page).toHaveURL(/.*\/categories\/CDC_AND_PLACEMENT\?.*subCategory=PLACEMENT_CONGRATULATIONS/);

    for (const sub of expectedSubsections) {
      await expect(page.getByRole("link", { name: sub, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Congratulations & Results", exact: true })).toHaveClass(/bg-amber-600/);

    // 4. Click All Placement
    await page.getByRole("link", { name: "All Placement", exact: true }).click();
    await expect(page).toHaveURL(/.*\/categories\/CDC_AND_PLACEMENT/);

    for (const sub of expectedSubsections) {
      await expect(page.getByRole("link", { name: sub, exact: true })).toBeVisible();
    }
  });

  test("Preserves priority and deadlines filters alongside school and subsection selections", async ({ page }) => {
    await page.goto("/categories/SCHOOLS?priority=HIGH&deadlines=true");

    // Click SCOPE
    await page.getByRole("link", { name: "SCOPE", exact: true }).click();
    await expect(page).toHaveURL(/.*\/categories\/SCHOOLS\?.*school=SCOPE/);
    await expect(page).toHaveURL(/.*priority=HIGH/);
    await expect(page).toHaveURL(/.*deadlines=true/);

    // Re-classify, Priority, and Deadlines remain visible
    await expect(page.getByText("Re-classify Emails")).toBeVisible();
    await expect(page.getByRole("link", { name: "Deadlines Only", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "High", exact: true })).toHaveClass(/bg-blue-600/);
  });

  test("Navigating into an email from a category page displays 'Back to <Category> Mails' option", async ({ page }) => {
    await page.goto("/categories/CDC_AND_PLACEMENT");

    // Click first email link if present
    const firstEmailCard = page.locator("a[href*='/email/']").first();
    if (await firstEmailCard.isVisible()) {
      await firstEmailCard.click();
      await expect(page).toHaveURL(/.*\/email\/.*/);

      // Verify 'Back to CDC & Placement Mails' button is visible
      const backToCategoryLink = page.getByRole("link", { name: /Back to .* Mails/i });
      await expect(backToCategoryLink).toBeVisible();

      // Verify 'Back to Inbox' is also visible
      await expect(page.getByRole("link", { name: "Back to Inbox" })).toBeVisible();

      // Click 'Back to ... Mails' and verify returning to the category page
      await backToCategoryLink.click();
      await expect(page).toHaveURL(/.*\/categories\/CDC_AND_PLACEMENT.*/);
    }
  });
});

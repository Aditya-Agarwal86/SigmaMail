import { test, expect } from "@playwright/test";

test.describe("CampusInbox Authentication & Route Protection", () => {
  test("renders login page with university domain notices and Google CTA", async ({ page }) => {
    await page.goto("/login");

    // Title and branding
    await expect(page.getByRole("heading", { name: "SigmaMail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student Sign-In" })).toBeVisible();

    // Domain Verification badge
    await expect(page.getByText("Domain Verification Enforced")).toBeVisible();
    await expect(page.getByText("@vitapstudent.ac.in")).toBeVisible();

    // Google Sign-in button
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

    // Disclaimer about Gmail sync being separate
    await expect(page.getByText(/Signing in only verifies your university student identity/i)).toBeVisible();
  });

  test("renders access-denied page when invalid domain is rejected", async ({ page }) => {
    await page.goto("/auth/access-denied?reason=Domain%20%27gmail.com%27%20is%20not%20an%20authorized%20college%20domain.");

    await expect(page.getByRole("heading", { name: "Access Restricted" })).toBeVisible();
    await expect(page.getByText("Eligibility Requirement")).toBeVisible();
    await expect(page.getByText("vitapstudent.ac.in")).toBeVisible();
    await expect(page.getByText(/gmail.com/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Try Again with University Email" })).toBeVisible();
  });

  test("renders user profile menu with sign-out option in application shell", async ({ page }) => {
    await page.goto("/");

    // User profile in header
    const profileTrigger = page.getByRole("banner").locator("button").filter({ hasText: /Demo Student|Student/ });
    await expect(profileTrigger).toBeVisible();

    // Open dropdown menu
    await profileTrigger.click();

    // Dropdown contains email and Sign Out action
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
    await expect(page.getByText("Demo Student Preview")).toBeVisible();
  });
});

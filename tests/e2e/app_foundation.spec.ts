import { test, expect } from "@playwright/test";

test.describe("CampusInbox Application Foundation", () => {
  test("renders inbox with synthetic preview banner and navigation", async ({ page }) => {
    await page.goto("/");

    // Verify Brand
    await expect(page.getByRole("heading", { name: "SigmaMail" })).toBeVisible();
    await expect(page.getByRole("complementary").getByText("vitapstudent.ac.in")).toBeVisible();

    // Verify Synthetic notice
    await expect(page.getByText("SigmaMail Synthetic Preview")).toBeVisible();

    // Verify Sidebar links
    await expect(page.getByRole("complementary").getByRole("link", { name: "Inbox" })).toBeVisible();
    await expect(page.getByRole("complementary").getByRole("link", { name: "Important" })).toBeVisible();
    await expect(page.getByRole("complementary").getByRole("link", { name: "Deadlines" })).toBeVisible();
    await expect(page.getByRole("complementary").getByRole("link", { name: /Academics/i })).toBeVisible();
  });

  test("navigates to Important view and shows priority items", async ({ page }) => {
    await page.goto("/important");
    await expect(page.getByRole("heading", { name: "Priority & Important Communications" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Digital Assignment 2/i })).toBeVisible();
  });

  test("navigates to Deadlines view and verifies action items", async ({ page }) => {
    await page.goto("/deadlines");
    await expect(page.getByRole("heading", { name: "Academic & Placement Deadlines" })).toBeVisible();
    await expect(page.getByText("FAT Hall Ticket Discrepancy Verification")).toBeVisible();
    await expect(page.getByText("Nexus Cloud Systems Registration Cut-Off")).toBeVisible();
  });

  test("navigates to Settings page and verifies domain verification badge", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Application Settings & Privacy Controls" })).toBeVisible();
    await expect(page.getByText("@vitapstudent.ac.in", { exact: true })).toBeVisible();
    await expect(page.getByText(/AES-256-GCM/i)).toBeVisible();
  });
});

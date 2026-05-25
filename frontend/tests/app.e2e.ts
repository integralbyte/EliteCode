import { expect, test } from "@playwright/test";

test("runs the default Two Sum starter and shows a judge result", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("EliteCode")).toBeVisible();
  await page.getByRole("button", { name: /Problem List/i }).click();
  await page.getByRole("button", { name: /^3\. Two Sum\b/ }).click();
  await expect(page.getByRole("heading", { name: /^3\. Two Sum$/ })).toBeVisible();
  await page.getByRole("button", { name: /run/i }).click();
  await expect(page.getByText(/Wrong Answer|Runtime Error|Accepted/)).toBeVisible();
});

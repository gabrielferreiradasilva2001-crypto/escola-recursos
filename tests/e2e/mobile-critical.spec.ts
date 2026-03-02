import { expect, test, type Page } from "@playwright/test";

const teacherUser = process.env.E2E_TEACHER_USER || "";
const teacherPass = process.env.E2E_TEACHER_PASSWORD || "";
const adminUser = process.env.E2E_ADMIN_USER || "";
const adminPass = process.env.E2E_ADMIN_PASSWORD || "";

async function loginFromPortal(page: Page, username: string, password: string) {
  await page.goto("/portal");

  const loginDialog = page.getByRole("dialog", { name: "Login obrigatório" });
  if (await loginDialog.isVisible().catch(() => false)) {
    const userInput = loginDialog.getByLabel("Usuário ou e-mail");
    await userInput.fill(username);
    await loginDialog.getByLabel("Senha").fill(password);
    await loginDialog.getByRole("button", { name: "Entrar" }).click();
  }

  // If account is flagged for first login, fail fast with a clear message.
  if (page.url().includes("/auth/first-login")) {
    throw new Error(
      "E2E user redirected to /auth/first-login. Use a test user with active password."
    );
  }

  await expect(page.getByRole("button", { name: "Sair" }).first()).toBeVisible({
    timeout: 30000,
  });

  await expect(loginDialog).toBeHidden({ timeout: 30000 });
}

test.describe("Mobile critical smoke", () => {
  test("portal loads in mobile viewport", async ({ page }) => {
    await page.goto("/portal");
    const loginTitle = page.getByRole("heading", {
      name: "Bem vindo(a)! Faça login para continuar.",
    });
    const newReservation = page.getByRole("link", { name: /Nova reserva/i });
    await expect(loginTitle.or(newReservation)).toBeVisible();
  });

  test("teacher calendar selection flow", async ({ page }) => {
    test.skip(!teacherUser || !teacherPass, "Missing E2E_TEACHER_USER/E2E_TEACHER_PASSWORD.");

    await loginFromPortal(page, teacherUser, teacherPass);
    await page.addInitScript(() => localStorage.setItem("mutare_calendar_card_mode", "1"));
    await page.goto("/calendar?year=2026");
    await expect(page.getByText("Calendário do mês")).toBeVisible();

    const firstCell = page.locator(".calendar-mobile-period-btn").first();
    await expect(firstCell).toBeVisible();
    await firstCell.click();
    await expect(page.locator(".calendar-mobile-selection-count").first()).toContainText("Selecionados:");
  });

  test("teacher-space header and weekly calendar", async ({ page }) => {
    test.skip(!teacherUser || !teacherPass, "Missing E2E_TEACHER_USER/E2E_TEACHER_PASSWORD.");

    await loginFromPortal(page, teacherUser, teacherPass);
    await page.goto("/teacher-space");
    await expect(page.getByText("Espaço do Professor(a)")).toBeVisible();
    await expect(page.getByText("Calendário da semana")).toBeVisible();
  });

  test("admin can open teacher quick actions popup", async ({ page }) => {
    test.skip(!adminUser || !adminPass, "Missing E2E_ADMIN_USER/E2E_ADMIN_PASSWORD.");

    await loginFromPortal(page, adminUser, adminPass);
    await page.goto("/portal/teachers?year=2026");
    await expect(page.getByText("Professores ativos")).toBeVisible();

    const moreButton = page.getByRole("button", { name: "Mais ações" }).first();
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    await expect(page.getByText("Escolha uma ação")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Escolha uma ação")).toBeHidden();
  });

  test("admin management page loads", async ({ page }) => {
    test.skip(!adminUser || !adminPass, "Missing E2E_ADMIN_USER/E2E_ADMIN_PASSWORD.");

    await loginFromPortal(page, adminUser, adminPass);
    await page.goto("/management");
    await expect(page.getByText("Espaço da Gestão")).toBeVisible();
  });
});

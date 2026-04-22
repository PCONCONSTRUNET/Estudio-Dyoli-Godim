import { test, expect } from "../../playwright-fixture";

/**
 * E2E — Fluxo público de agendamento
 *
 * Cobre a navegação que o cliente faz antes do pagamento:
 *   Home → Agendar → Servicos → (auth wall ou confirmar)
 *
 * Não dispara pagamento real — para testar webhook use a suíte Deno
 * em `supabase/functions/*-webhook/index_test.ts`.
 */

test.describe("Fluxo de agendamento público", () => {
  test("Home carrega com CTAs principais visíveis", async ({ page }) => {
    await page.goto("/");

    // Hero deve mostrar CTA de agendar
    await expect(page.getByRole("button", { name: /agendar/i }).first()).toBeVisible();

    // Botões de auth visíveis pra visitante
    await expect(page.getByRole("button", { name: /entrar/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cadastrar/i })).toBeVisible();
  });

  test("Visitante clicando em Agendar vai para tela de cadastro", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /agendar/i }).first().click();

    // Sem sessão, redireciona para auth?mode=signup
    await expect(page).toHaveURL(/\/auth/);
  });

  test("Página /agendar é acessível e mostra opções", async ({ page }) => {
    await page.goto("/agendar");
    // Não deve dar 404; espera ver algum conteúdo
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("body")).not.toContainText("Page not found");
  });

  test("Página /servicos lista categorias", async ({ page }) => {
    await page.goto("/servicos");
    // Lista deve mostrar pelo menos uma das categorias principais
    const hasService = await page.getByText(/micropigmentação|perfuração/i).first().isVisible().catch(() => false);
    expect(hasService).toBe(true);
  });

  test("Cadastro: validação de campos obrigatórios", async ({ page }) => {
    await page.goto("/auth?mode=signup");

    // Tenta submeter vazio — deve manter na tela
    const submitBtn = page.getByRole("button", { name: /criar conta|cadastrar/i }).first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      // HTML5 required impede submissão; URL não muda
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test("Página /sucesso renderiza sem dados (estado vazio gracioso)", async ({ page }) => {
    await page.goto("/sucesso");
    await expect(page.locator("body")).not.toContainText("TypeError");
    await expect(page.locator("body")).not.toContainText("Cannot read");
  });

  test("Página /produtos carrega a vitrine", async ({ page }) => {
    await page.goto("/produtos");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("Página de admin exige autenticação", async ({ page }) => {
    await page.goto("/admin");
    // Deve mostrar tela de auth ou redirecionar — não deve mostrar dashboard
    await expect(page.locator("body")).not.toContainText("Caixa Total");
  });
});

test.describe("Resiliência de erros", () => {
  test("Console não tem erros críticos na home", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const txt = msg.text();
        // Ignora avisos esperados (favicon, manifest, etc.)
        if (!/favicon|manifest|onesignal|service worker/i.test(txt)) {
          errors.push(txt);
        }
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(errors).toEqual([]);
  });
});

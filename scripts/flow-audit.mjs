/** Fluxos ponta a ponta em conta temporária; todos os dados de teste são removidos. */
import { chromium } from "playwright";
import env from "@next/env";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
env.loadEnvConfig(process.cwd());
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(BASE).hostname)) throw new Error("Execute somente em um servidor local.");
const prisma = new PrismaClient();
const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 1000 }, timezoneId: "America/Sao_Paulo", locale: "pt-BR" });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const email = "auditoria-" + Date.now() + "@example.test";
const password = "Auditoria!2026-segura";
const results = [];
const visit = url => page.goto(url, { waitUntil: "domcontentloaded" });
let userId;
async function check(name, condition) {
  if (!condition) throw new Error(name);
  results.push({ name, ok: true }); console.log("OK " + name);
}
async function poll(fn) {
  for (let i = 0; i < 60; i++) { if (await fn()) return; await page.waitForTimeout(150); }
  throw new Error("A atualização não foi persistida.");
}
try {
  await visit(BASE + "/cadastro");
  await page.getByLabel("Nome completo", { exact: true }).fill("Aluno Auditoria");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar senha", { exact: true }).fill(password + "X");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "As senhas precisam ser iguais" }).waitFor();
  await check("Cadastro recusa senhas diferentes", !(await prisma.user.findUnique({ where: { email } })));
  await page.getByLabel("Nome completo", { exact: true }).fill("Aluno Auditoria");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await page.waitForURL(BASE + "/login?cadastro=sucesso");
  const created = await prisma.user.findUnique({ where: { email } }); userId = created?.id;
  await check("Cadastro cria apenas perfil ALUNO", Boolean(userId) && created.role === "ALUNO");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "E-mail ou senha incorretos" }).waitFor();
  await check("Login recusa credenciais inválidas", new URL(page.url()).pathname === "/login");
  await visit(BASE + "/login?callbackUrl=" + encodeURIComponent("/app/cursos?q=ingles"));
  await page.getByLabel("E-mail", { exact: true }).fill(email.toUpperCase());
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(BASE + "/app/cursos?q=ingles");
  await check("Login normaliza e-mail e preserva destino com filtros", true);
  const search = page.getByRole("search").getByRole("searchbox");
  await search.fill("Business"); await search.press("Enter");
  await page.waitForURL(BASE + "/app/cursos?q=Business");
  await check("Busca do topo abre o catálogo filtrado", await page.getByPlaceholder("Buscar curso, categoria ou professor…").inputValue() === "Business");
  const course = await prisma.course.findFirst({ where: { published: true, modules: { some: { lessons: { some: { published: true, free: false } } } } }, include: { modules: { orderBy: { position: "asc" }, include: { lessons: { where: { published: true }, orderBy: { position: "asc" } } } } } });
  if (!course) throw new Error("Curso de demonstração indisponível.");
  const lessons = course.modules.flatMap(m => m.lessons);
  const locked = lessons.find(l => !l.free);
  await visit(BASE + "/app/aulas/" + locked.id);
  await page.waitForURL(BASE + "/app/cursos/" + course.slug + "#inscricao");
  await check("Link direto não libera aula sem matrícula", true);
  await page.getByRole("button", { name: "Inscrever-se", exact: true }).click();
  await poll(async () => Boolean(await prisma.enrollment.findFirst({ where: { studentId: userId, courseId: course.id, status: "ATIVO" } })));
  await check("Inscrição persiste e libera o curso", true);
  for (const lesson of lessons) {
    await visit(BASE + "/app/aulas/" + lesson.id);
    await page.getByRole("button", { name: "Marcar concluída", exact: true }).click();
    await poll(async () => Boolean(await prisma.lessonProgress.findFirst({ where: { studentId: userId, lessonId: lesson.id, completed: true } })));
  }
  await poll(async () => Boolean(await prisma.enrollment.findFirst({ where: { studentId: userId, courseId: course.id, status: "CONCLUIDO", progress: 100 } })));
  await check("Concluir todas as aulas finaliza o curso em 100%", true);
  await poll(async () => await prisma.certificate.count({ where: { studentId: userId, courseId: course.id, status: "EMITIDO" } }) === 1);
  await check("Conclusão do curso emite um certificado", true);
  await page.getByRole("button", { name: "Concluída", exact: true }).click();
  await poll(async () => Boolean(await prisma.enrollment.findFirst({ where: { studentId: userId, courseId: course.id, status: "ATIVO", finishedAt: null, progress: { lt: 100 } } })));
  await check("Desmarcar aula reabre o curso e limpa conclusão", true);
  const beforeCancel = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: userId, courseId: course.id } } });
  await visit(BASE + "/app/cursos/" + course.slug);
  await page.getByRole("button", { name: "Cancelar inscrição", exact: true }).click();
  await poll(async () => Boolean(await prisma.enrollment.findFirst({ where: { studentId: userId, courseId: course.id, status: "CANCELADO" } })));
  await visit(BASE + "/app/aulas/" + locked.id);
  await page.waitForURL(BASE + "/app/cursos/" + course.slug + "#inscricao");
  await check("Cancelar matrícula bloqueia novamente a aula", true);
  await page.getByRole("button", { name: "Inscrever-se", exact: true }).click();
  await poll(async () => Boolean(await prisma.enrollment.findFirst({ where: { studentId: userId, courseId: course.id, status: "ATIVO", progress: beforeCancel.progress } })));
  await check("Nova inscrição preserva o progresso anterior", true);
  await page.goto(BASE + "/app/certificados", { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 320, height: 720 });
  await check("Certificado renderiza em celular", await page.getByRole("button", { name: "Imprimir", exact: true }).count() === 1 && !await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
  await check("Certificado não é duplicado ao revisitar o curso", await prisma.certificate.count({ where: { studentId: userId, courseId: course.id } }) === 1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const exam = await prisma.exam.findFirst({ where: { published: true }, select: { id: true } });
  if (exam) {
    await visit(BASE + "/app/provas/" + exam.id + "/realizar");
    await page.waitForURL(BASE + "/app/provas/" + exam.id);
    await check("Abrir URL da prova não consome tentativa", await prisma.examAttempt.count({ where: { studentId: userId } }) === 0);
    await page.getByRole("button", { name: "Começar prova", exact: true }).click();
    await page.waitForURL(BASE + "/app/provas/" + exam.id + "/realizar");
    await check("Começar prova cria uma tentativa", await prisma.examAttempt.count({ where: { studentId: userId, status: "EM_ANDAMENTO" } }) === 1);
    await page.getByRole("button", { name: "Revisar e enviar", exact: true }).last().click();
    const dialog = page.getByRole("dialog"); await dialog.waitFor();
    const buttons = await dialog.getByRole("button").allTextContents();
    console.log("Confirmação da prova: " + buttons.join(" | "));
    const submit = dialog.getByRole("button", { name: /Enviar|Confirmar|Entregar/ }).last();
    await submit.click();
    await page.waitForURL(/\/app\/provas\/resultado\//);
    await check("Enviar prova abre resultado e persiste a nota", Boolean(await prisma.examAttempt.findFirst({ where: { studentId: userId, status: "CONCLUIDA", score: { not: null } } })));
  }
  await prisma.notification.create({ data: { userId, title: "Aviso da auditoria", body: "Mensagem temporária de teste.", href: "/app/cursos" } });
  await visit(BASE + "/app/notificacoes");
  await page.getByRole("button", { name: "Marcar como lidas", exact: true }).click();
  await poll(async () => await prisma.notification.count({ where: { userId, read: false } }) === 0);
  await check("Notificações são marcadas como lidas", true);
  await visit(BASE + "/app/configuracoes");
  await page.locator('input[autocomplete="name"]').fill("Aluno Auditoria Atualizado");
  await page.getByRole("button", { name: "Salvar perfil", exact: true }).click();
  await poll(async () => Boolean(await prisma.user.findFirst({ where: { id: userId, name: "Aluno Auditoria Atualizado" } })));
  await visit(BASE + "/app");
  await check("Perfil atualizado aparece no menu sem novo login", await page.getByRole("button").filter({ hasText: "Aluno Auditoria Atualizado" }).count() === 1);
  await page.getByRole("button").filter({ hasText: "Aluno Auditoria Atualizado" }).click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page.waitForURL(BASE + "/login");
  await visit(BASE + "/app"); await page.waitForURL(/\/login\?callbackUrl=/);
  await check("Sair encerra a sessão e protege as rotas", true);
  await visit(BASE + "/login?callbackUrl=" + encodeURIComponent("https://example.com"));
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL(BASE + "/app");
  await check("Login ignora redirecionamento para domínio externo", true);
} catch(error) {
  results.push({ name: error.message, ok: false });
  console.error(error);
  mkdirSync("audit", { recursive: true });
  await page.screenshot({ path: "audit/fluxo-falha.png", fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
  mkdirSync("audit", { recursive: true });
  writeFileSync("audit/fluxos.json", JSON.stringify({ total: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results }, null, 2));
  console.log(JSON.stringify({ total: results.length, passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length }));
}

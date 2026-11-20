/** Auditoria local: HTTP, autenticação, permissões e renderização real por perfil. */
import { chromium, request } from "playwright";
import env from "@next/env";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
env.loadEnvConfig(process.cwd());
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(BASE).origin;
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(BASE).hostname)) throw new Error("Execute esta auditoria somente contra um servidor local.");
const prisma = new PrismaClient();
const report = [];
const browserMode = process.argv.includes("--browser");
const browser = browserMode ? await chromium.launch() : null;
const accounts = [
  { role: "ALUNO", email: process.env.AUDIT_EMAIL ?? "ana-beatriz-lima@email.com" },
  { role: "PROFESSOR", email: "marina@scottenglish.com.br" },
  { role: "EDITOR", email: "julia@scottenglish.com.br" },
  { role: "ADMIN", email: "scott@scottenglish.com.br" },
];
const restrictions = {
  "/app/admin/usuarios": ["ADMIN"],
  "/app/biblioteca": ["ADMIN", "EDITOR", "PROFESSOR"],
  "/app/alunos": ["ADMIN", "PROFESSOR"],
  "/app/correcoes": ["ADMIN", "PROFESSOR"],
  "/app/gestao-conteudo": ["ADMIN", "EDITOR", "PROFESSOR"],
};
function staticPages(dir, segments = []) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("[")) return staticPages(join(dir, entry.name), [...segments, entry.name]);
    if (entry.name === "page.tsx") return ["/app" + (segments.length ? "/" + segments.join("/") : "")];
    return [];
  });
}
const routes = staticPages(join(process.cwd(), "src/app/app"));
function record(role, route, status, errors = [], finalPath = route) {
  const result = { role, route, status, finalPath, errors, ok: errors.length === 0 };
  report.push(result);
  console.log((result.ok ? "OK " : "FAIL ") + role + " " + route + " [" + status + "]" + (errors.length ? " " + errors.join("; ") : ""));
}
try {
  const anonymous = await request.newContext({ baseURL: BASE });
  for (const route of ["/", "/sobre", "/login", "/cadastro", "/recuperar-senha", "/termos", "/privacidade", "/offline", "/api/health", "/api/auth/csrf", "/manifest.webmanifest", "/sw.js"]) {
    const response = await anonymous.get(route);
    record("PUBLICO", route, response.status(), response.status() === 200 ? [] : ["Esperado HTTP 200"]);
  }
  const protectedResponse = await anonymous.get("/app/cursos?q=ingles", { maxRedirects: 0 });
  const location = protectedResponse.headers().location ?? "";
  record("PUBLICO", "/app/cursos?q=ingles", protectedResponse.status(), protectedResponse.status() === 307 && location.includes("/login") && location.includes("callbackUrl") ? [] : ["Rota privada sem redirecionamento correto"]);
  const missing = await anonymous.get("/pagina-inexistente-auditoria");
  record("PUBLICO", "/pagina-inexistente-auditoria", missing.status(), missing.status() === 404 ? [] : ["Esperado HTTP 404"]);
  await anonymous.dispose();
  const courses = await prisma.course.findMany({ where: { published: true }, select: { id: true, slug: true } });
  const exams = await prisma.exam.findMany({ where: { published: true }, select: { id: true } });
  for (const account of accounts) {
    const user = await prisma.user.findUnique({ where: { email: account.email }, select: { id: true } });
    if (!user) throw new Error("Conta de demonstração não encontrada: " + account.role);
    const api = await request.newContext({ baseURL: BASE });
    const csrf = await api.get("/api/auth/csrf");
    const { csrfToken } = await csrf.json();
    await api.post("/api/auth/callback/credentials", { form: { csrfToken, email: account.email, password: process.env.AUDIT_SENHA ?? "senha123", callbackUrl: BASE + "/app" }, maxRedirects: 0 });
    const storage = await api.storageState();
    if (!storage.cookies.some(c => c.name.includes("session-token"))) throw new Error("Login falhou: " + account.role);
    const ctx = browser ? await browser.newContext({ storageState: storage, serviceWorkers: "block", viewport: { width: 1440, height: 900 }, timezoneId: "America/Sao_Paulo", locale: "pt-BR" }) : null;
    const page = ctx ? await ctx.newPage() : null;
    const browserErrors = [];
    if (page) {
      page.on("pageerror", error => browserErrors.push(error.message));
      page.on("response", res => { if (new URL(res.url()).origin === ORIGIN && res.status() >= 500) browserErrors.push("HTTP " + res.status() + " " + new URL(res.url()).pathname); });
    }
    const lesson = await prisma.lesson.findFirst({ where: { published: true, module: { course: { published: true } }, OR: [{ free: true }, { module: { course: { enrollments: { some: { studentId: user.id, status: { not: "CANCELADO" } } } } } }] }, select: { id: true } });
    const privateSession = await prisma.scheduledSession.findFirst({ where: account.role === "ADMIN" ? { kind: "AULA_PARTICULAR" } : { kind: "AULA_PARTICULAR", OR: [{ studentId: user.id }, { teacherId: user.id }] }, select: { id: true } });
    const attempt = await prisma.examAttempt.findFirst({ where: { studentId: user.id, status: "CONCLUIDA" }, select: { id: true } });
    const checkRoutes = [...routes, ...courses.map(c => "/app/cursos/" + c.slug), ...exams.map(e => "/app/provas/" + e.id)];
    if (lesson) checkRoutes.push("/app/aulas/" + lesson.id);
    if (privateSession) checkRoutes.push("/app/particulares/" + privateSession.id);
    if (attempt) checkRoutes.push("/app/provas/resultado/" + attempt.id);
    for (const route of checkRoutes) {
      browserErrors.length = 0;
      const errors = [];
      try {
        let status, finalPath, text;
        if (page) {
          const response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
          if (restrictions[route] && !restrictions[route].includes(account.role)) await page.waitForURL(BASE + "/app", { waitUntil: "domcontentloaded", timeout: 15000 });
          await page.waitForTimeout(450);
          status = response?.status() ?? 0;
          finalPath = new URL(page.url()).pathname;
          text = await page.locator("body").innerText();
          errors.push(...browserErrors);
          if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) errors.push("Overflow horizontal desktop");
        } else {
          const response = await api.get(route);
          status = response.status(); finalPath = new URL(response.url()).pathname; text = await response.text();
        }
        if (status !== 200) errors.push("Esperado HTTP 200");
        if (text.includes("Algo deu errado") || text.includes("Application error:")) errors.push("Erro de renderização");
        const allowed = !restrictions[route] || restrictions[route].includes(account.role);
        if (allowed && finalPath !== route) errors.push("Redirecionamento inesperado para " + finalPath);
        if (!allowed && finalPath !== "/app") errors.push("Permissão não aplicada");
        record(account.role, route, status, errors, finalPath);
      } catch(error) { record(account.role, route, 0, [error.message.split("\n")[0]]); }
    }
    // Links com IDs inexistentes devem terminar em 404, não em um erro de servidor.
    for (const route of ["/app/cursos/curso-inexistente-auditoria", "/app/aulas/aula-inexistente-auditoria", "/app/provas/prova-inexistente-auditoria", "/app/particulares/sessao-inexistente-auditoria", "/app/provas/resultado/tentativa-inexistente-auditoria"]) {
      const response = await api.get(route);
      // Streaming pode enviar HTTP 200 antes de resolver notFound(); o marcador identifica o 404 do Next.
      const html = await response.text();
      record(account.role, route, response.status(), response.status() === 404 || (response.status() === 200 && html.includes("NEXT_HTTP_ERROR_FALLBACK;404")) ? [] : ["Esperado notFound"]);
    }
    if (ctx) await ctx.close();
    await api.dispose();
  }
} catch(error) {
  record("AUDITORIA", "execucao", 0, [error.message]);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await prisma.$disconnect();
  mkdirSync("audit", { recursive: true });
  const summary = { mode: browserMode ? "browser" : "http", total: report.length, passed: report.filter(r => r.ok).length, failed: report.filter(r => !r.ok).length, results: report };
  writeFileSync("audit/rotas.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ total: summary.total, passed: summary.passed, failed: summary.failed }));
  if (!report.length || summary.failed) process.exitCode = 1;
}

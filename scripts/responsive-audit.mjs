/**
 * Auditoria responsiva — Scott English Academy
 *
 * Usa o servidor local já rodando e faz login com uma conta de
 * demonstração e percorre as rotas em várias larguras, capturando:
 *   - overflow horizontal (a causa nº 1 de "tela quebrada" no mobile)
 *   - elementos que estouram a viewport
 *   - erros de console / requisições 500
 *   - screenshots para inspeção visual
 *
 * Uso: node scripts/responsive-audit.mjs [--urls a,b,c] [--email x --senha y]
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = join(process.cwd(), process.env.AUDIT_DIR ?? "audit");
const args = process.argv.slice(2);
function option(name) { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
const EMAIL = option("--email") ?? process.env.AUDIT_EMAIL ?? "ana-beatriz-lima@email.com";
const SENHA = option("--senha") ?? process.env.AUDIT_SENHA ?? "senha123";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(BASE).hostname)) throw new Error("Execute a auditoria somente em um servidor local.");

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 720, isMobile: true },
  { name: "mobile-375", width: 375, height: 812, isMobile: true },
  { name: "mobile-414", width: 414, height: 896, isMobile: true },
  { name: "tablet-768", width: 768, height: 1024, isMobile: false },
  { name: "tablet-1024", width: 1024, height: 768, isMobile: false },
  { name: "desktop-1440", width: 1440, height: 900, isMobile: false },
].filter(vp => !process.env.AUDIT_WIDTHS || process.env.AUDIT_WIDTHS.split(",").includes(String(vp.width)));

const ROTAS = [
  "/",
  "/sobre",
  "/login",
  "/cadastro",
  "/app",
  "/app/cursos",
  "/app/aulas",
  "/app/provas",
  "/app/agenda",
  "/app/particulares",
  "/app/progresso",
  "/app/certificados",
  "/app/assinatura",
  "/app/pagamentos",
  "/app/configuracoes",
  "/app/suporte",
  "/app/notificacoes",
  "/app/alunos",
  "/app/biblioteca",
  "/app/correcoes",
  "/app/admin/usuarios",
];

const only = args.includes("--urls")
  ? args[args.indexOf("--urls") + 1].split(",")
  : null;
let rotas = only ?? ROTAS;
const fullPage = args.includes("--full");

mkdirSync(OUT, { recursive: true });

const achados = [];
const relatorio = [];

function log(msg) {
  console.log(msg);
}

/** Detecta elementos que causam overflow horizontal. */
function detectarOverflow() {
  const vw = document.documentElement.clientWidth;
  const problemas = [];
  const scrollW = document.documentElement.scrollWidth;
  if (scrollW > vw + 1) {
    problemas.push({
      tipo: "documento",
      seletor: "html",
      largura: scrollW,
      viewport: vw,
      excesso: scrollW - vw,
    });
  }
  const todos = document.querySelectorAll("body *");
  for (const el of todos) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed") continue;
    if (cs.overflowX === "auto" || cs.overflowX === "scroll" || cs.overflowX === "hidden") continue;

    const direita = r.right;
    const esquerda = r.left;
    if (direita > vw + 1 || esquerda < -1) {
      // ignora elementos dentro de containers com scroll próprio
      let pai = el.parentElement;
      let dentroDeScroll = false;
      while (pai && pai !== document.body) {
        const pcs = getComputedStyle(pai);
        if (["auto", "scroll", "hidden"].includes(pcs.overflowX)) {
          dentroDeScroll = true;
          break;
        }
        pai = pai.parentElement;
      }
      if (dentroDeScroll) continue;

      let seletor = el.tagName.toLowerCase();
      if (typeof el.className === "string" && el.className.trim()) {
        seletor += "." + el.className.trim().split(/\s+/).slice(0, 3).join(".");
      }
      problemas.push({
        tipo: "elemento",
        seletor,
        direita: Math.round(direita),
        esquerda: Math.round(esquerda),
        viewport: vw,
        excesso: Math.round(Math.max(direita - vw, -esquerda)),
      });
    }
  }
  return problemas.slice(0, 12);
}

const browser = await chromium.launch();
const contexto = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  serviceWorkers: "block",
});

const publico = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo", serviceWorkers: "block" });
const paginaPublica = await publico.newPage();
const erros = [];
contexto.on("weberror", (e) => erros.push(`weberror: ${e.error().message}`));

const paginaLogada = await contexto.newPage();
let page = paginaLogada;
const consoleErrors = [];
for (const observed of [paginaLogada, paginaPublica]) observed.on("pageerror", error => consoleErrors.push(error.message));
for (const observed of [paginaLogada, paginaPublica]) observed.on("console", (m) => {
  if (m.type() === "error") {
    const t = m.text();
    if (!t.includes("favicon") && !t.includes("Download the React DevTools")) {
      consoleErrors.push(t.slice(0, 200));
    }
  }
});
for (const observed of [paginaLogada, paginaPublica]) observed.on("response", (r) => {
  if (r.status() >= 500) consoleErrors.push(`HTTP ${r.status()} ${r.url()}`);
});

// ---- login ----
log("→ Autenticando...");
try {
  // Fluxo do Auth.js: pega o csrfToken e chama o callback de credentials.
  const csrfRes = await contexto.request.get(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  const loginRes = await contexto.request.post(
    `${BASE}/api/auth/callback/credentials`,
    {
      form: {
        csrfToken,
        email: EMAIL,
        password: SENHA,
        callbackUrl: `${BASE}/app`,
      },
      maxRedirects: 0,
    },
  );

  const cookies = await contexto.cookies();
  const temSessao = cookies.some((c) => c.name.includes("session-token"));
  if (!temSessao) {
    throw new Error(`Login sem sessão (HTTP ${loginRes.status()}). Confira a conta de demonstração.`);
  }
  const userSession = await (await contexto.request.get(`${BASE}/api/auth/session`)).json();
  const role = userSession.user?.role;
  const restricted = { "/app/admin/usuarios": ["ADMIN"], "/app/alunos": ["ADMIN", "PROFESSOR"], "/app/biblioteca": ["ADMIN", "EDITOR", "PROFESSOR"], "/app/correcoes": ["ADMIN", "PROFESSOR"] };
  rotas = rotas.filter(route => !restricted[route] || restricted[route].includes(role));
  log(`   ✓ login ok (${role})`);
} catch (e) {
  log(`   ✗ login falhou: ${e.message}`);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: join(OUT, "login-falha.png") });
  await browser.close();
  throw e;
}

for (const vp of VIEWPORTS) {
  log(`\n── ${vp.name} (${vp.width}×${vp.height}) ──`);

  await page.setViewportSize({ width: vp.width, height: vp.height });

  for (const rota of rotas) {
    consoleErrors.length = 0;
    page = rota.startsWith("/app") ? paginaLogada : paginaPublica;
    await page.setViewportSize({ width: vp.width, height: vp.height });
    try {
      const resp = await page.goto(`${BASE}${rota}`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForTimeout(700);

      const status = resp?.status() ?? 0;
      const finalPath = new URL(page.url()).pathname;
      if (finalPath !== new URL(rota, BASE).pathname) consoleErrors.push(`Redirecionamento inesperado para ${finalPath}`);
      if (await page.getByText("Algo deu errado", { exact: true }).count()) consoleErrors.push("Erro de renderização");
      if (status >= 400) achados.push({ tipo: "http", seletor: `HTTP ${status}`, rota, viewport: vp.name });
      const problemas = await page.evaluate(detectarOverflow);

      const nome = rota === "/" ? "home" : rota.replace(/\//g, "_").replace(/^_/, "");
      const arq = join(OUT, `${vp.name}__${nome}.png`);
      await page.screenshot({ path: arq, fullPage });

      const registro = {
        viewport: vp.name,
        rota,
        status,
        overflow: problemas,
        consoleErrors: [...consoleErrors],
      };
      relatorio.push(registro);

      const statusTxt = status >= 400 ? `HTTP ${status}` : "ok";
      if (problemas.length || status >= 400 || consoleErrors.length) {
        log(`  ✗ ${rota} [${statusTxt}]`);
        for (const p of problemas) {
          log(`      overflow: ${p.tipo} ${p.seletor} (excesso ${p.excesso}px)`);
          achados.push({ ...p, rota, viewport: vp.name });
        }
        for (const e of consoleErrors.slice(0, 3)) {
          log(`      erro: ${e}`);
          achados.push({ tipo: "console", seletor: e, rota, viewport: vp.name });
        }
      } else {
        log(`  ✓ ${rota}`);
      }
    } catch (e) {
      log(`  ✗ ${rota} — ${e.message.split("\n")[0]}`);
      achados.push({ tipo: "navegacao", seletor: e.message.split("\n")[0], rota, viewport: vp.name });
    }
  }
}

for (const erro of erros) achados.push({ tipo: "javascript", seletor: erro });
writeFileSync(join(OUT, "relatorio.json"), JSON.stringify({ relatorio, achados }, null, 2));

log(`\n${"=".repeat(60)}`);
log(`Achados: ${achados.length}`);
log(`Screenshots em: ${OUT}`);
log("=".repeat(60));

await browser.close();
process.exit(achados.length ? 1 : 0);

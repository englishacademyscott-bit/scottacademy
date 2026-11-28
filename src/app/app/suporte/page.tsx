import { requireUser } from "@/lib/guards";
import { SectionHeader } from "@/components/ui/primitives";
import { SupportContact } from "@/components/app/suporte-view";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { BookOpen, ChevronDown, LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { replySupportMessage } from "./actions";

export const metadata = { title: "Suporte" };
export const dynamic = "force-dynamic";

const FAQ = [
  {
    question: "Como funciona o acesso às aulas ao vivo?",
    answer:
      "As aulas são ao vivo, exclusivas por aluno e personalizadas para cada aluno conversar e praticar. Elas aparecem na sua agenda com o link de acesso cadastrado pelo professor.",
  },
  {
    question: "Perdi o acesso a uma prova. O que faço?",
    answer:
      "Cada prova tem um limite de tentativas definido pelo professor. Se as tentativas acabarem antes de você se sentir preparado, envie uma mensagem pelo canal de suporte ao lado e a equipe libera novas tentativas para você.",
  },
  {
    question: "Como recebo o certificado de conclusão?",
    answer:
      "O certificado é emitido automaticamente quando você conclui 100% das aulas publicadas do curso. Ele fica disponível na área “Certificados” e pode ser impresso ou salvo em PDF pelo navegador.",
  },
  {
    question: "Posso trocar de plano ou cancelar a assinatura?",
    answer:
      "Trabalhamos com 2 planos de aulas ao vivo exclusivas: 1x por semana e 2x por semana. Para saber mais ou ajustar seu plano, entre em contato com a nossa equipe — nosso diferencial faz a diferença no seu aprendizado.",
  },
  {
    question: "Como funciona a correção das redações?",
    answer:
      "Cada resposta em texto livre fica pendente para o professor responsável pelo curso. Quando a correção for registrada, você recebe uma notificação com a pontuação e o feedback.",
  },
  {
    question: "Os pagamentos são processados por quais meios?",
    answer:
      "Você pode contratar ou alterar seu plano na página “Assinatura”, com acompanhamento completo das faturas e comprovantes na área “Pagamentos”.",
  },
  {
    question: "Esqueci minha senha. Como recupero?",
    answer:
      "Use o link “Esqueci minha senha” na tela de login. O link de redefinição expira em 30 minutos e deixa de funcionar após a troca.",
  },
];

export default async function SuportePage() {
  const user = await requireUser();
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "englishacademyscott@gmail.com";
  const supportWhatsApp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5515998229592";
  const tickets = user.role === "ADMIN" ? await prisma.notification.findMany({ where: { userId: user.id, title: { startsWith: "Suporte [" } }, orderBy: { createdAt: "desc" }, take: 50 }) : [];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Central de ajuda"
        description="Respostas rápidas para as dúvidas mais comuns e um canal direto com o time da Scott English Academy."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* FAQ */}
        <section aria-labelledby="faq-title" className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-500" />
            <h2 id="faq-title" className="text-lg font-bold tracking-tight text-default">
              Perguntas frequentes
            </h2>
          </div>

          {FAQ.map((item) => (
            <details
              key={item.question}
              className="group rounded-xl border border-subtle bg-surface shadow-soft transition-colors open:border-brand-200 dark:open:border-brand-500/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-default [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-muted">{item.answer}</div>
            </details>
          ))}
        </section>

        {/* Canais */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-subtle bg-surface p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-brand-500" />
              <h2 className="text-base font-bold tracking-tight text-default">Canais de atendimento</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {supportEmail ? <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                <div>
                  <p className="font-medium text-default">E-mail</p>
                  <a href={`mailto:${supportEmail}`} className="text-brand-600 hover:underline dark:text-brand-300">
                    {supportEmail}
                  </a>
                </div>
              </li> : null}
              {supportWhatsApp ? <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                <div>
                  <p className="font-medium text-default">WhatsApp</p>
                  <WhatsAppLink phone={supportWhatsApp} message="Olá! Preciso de ajuda com a plataforma da Scott English Academy." className="text-brand-600 hover:underline dark:text-brand-300">Falar pelo WhatsApp</WhatsAppLink>
                </div>
              </li> : null}
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                <div>
                  <p className="font-medium text-default">Formulário de suporte</p>
                  <p className="text-muted">Envie sua solicitação e guarde o número do protocolo.</p>
                </div>
              </li>
            </ul>
          </div>

          <SupportContact />
        </aside>
      </div>
      {user.role === "ADMIN" ? <section className="space-y-3" aria-labelledby="tickets-title">
        <h2 id="tickets-title" className="text-lg font-bold text-default">Solicitações recebidas</h2>
        {tickets.length === 0 ? <p className="text-sm text-muted">Nenhuma solicitação pendente.</p> : tickets.map((ticket) => {
          const protocol = ticket.title.match(/\[([^\]]+)\]/)?.[1] ?? ticket.id;
          const userId = ticket.body.match(/\[usuário:([^\]]+)\]/)?.[1] ?? "";
          return <article key={ticket.id} className="rounded-xl border border-subtle bg-surface p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-default">{ticket.title}</h3><span className="text-xs text-muted">{ticket.createdAt.toLocaleString("pt-BR")}</span></div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{ticket.body.replace(/ \[usuário:[^\]]+\]/, "")}</p>
            {userId ? <form action={replySupportMessage} className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="hidden" name="ticket" value={protocol}/><input type="hidden" name="userId" value={userId}/><textarea name="message" required minLength={3} placeholder="Resposta ao aluno" className="min-h-20 flex-1 rounded-lg border border-subtle bg-surface px-3 py-2 text-sm"/><Button type="submit">Responder</Button></form> : null}
          </article>;
        })}
      </section> : null}
    </div>
  );
}

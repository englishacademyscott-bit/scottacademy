import { requireUser } from "@/lib/guards";
import { SectionHeader } from "@/components/ui/primitives";
import { SupportContact } from "@/components/app/suporte-view";
import { BookOpen, ChevronDown, LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";

export const metadata = { title: "Suporte" };
export const dynamic = "force-dynamic";

const FAQ = [
  {
    question: "Como funciona o acesso às aulas ao vivo?",
    answer:
      "As aulas ao vivo acontecem em horário fixo, aparecem na sua agenda e o link de acesso fica disponível 15 minutos antes do início. Se você perder a chamada, a gravação é publicada na biblioteca em até 48 horas.",
  },
  {
    question: "Perdi o acesso a uma prova. O que faço?",
    answer:
      "Cada prova tem um limite de tentativas definido pelo professor. Se as tentativas acabarem antes de você se sentir preparado, envie uma mensagem pelo canal de suporte ao lado e a equipe libera novas tentativas para você.",
  },
  {
    question: "Como recebo o certificado de conclusão?",
    answer:
      "O certificado é emitido automaticamente quando você conclui todos os módulos de um curso com 60% ou mais de aproveitamento. Ele fica disponível na área “Certificados” e pode ser baixado em PDF.",
  },
  {
    question: "Posso trocar de plano ou cancelar a assinatura?",
    answer:
      "Sim. Na página “Assinatura” você troca de plano a qualquer momento e cancela quando quiser — você continua com o acesso até o fim do período já pago. Não há fidelidade nem taxa de cancelamento.",
  },
  {
    question: "Como funciona a correção das redações?",
    answer:
      "Cada prova escrita em texto livre é enviada ao professor responsável pelo curso. Você recebe um feedback por notificação com os pontos atribuídos e as sugestões de melhoria, geralmente em até 5 dias úteis.",
  },
  {
    question: "Os pagamentos são processados por quais meios?",
    answer:
      "Aceitamos cartão de crédito, Pix e boleto. O boleto é compensado em até 3 dias úteis e o acesso é liberado assim que a confirmação acontece.",
  },
  {
    question: "Esqueci minha senha. Como recupero?",
    answer:
      "Na tela de login, use o link “Esqueci minha senha”. Você recebe um e-mail com o link de redefinição. Se o e-mail não chegar em alguns minutos, verifique o spam ou fale com o suporte.",
  },
];

export default async function SuportePage() {
  await requireUser();

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
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                <div>
                  <p className="font-medium text-default">E-mail</p>
                  <a href="mailto:suporte@scottenglish.com.br" className="text-brand-600 hover:underline dark:text-brand-300">
                    suporte@scottenglish.com.br
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                <div>
                  <p className="font-medium text-default">WhatsApp</p>
                  <p className="text-muted">+55 11 4002-8922 · seg a sex, 9h às 18h</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
                <div>
                  <p className="font-medium text-default">Formulário abaixo</p>
                  <p className="text-muted">Respondemos em até 1 dia útil.</p>
                </div>
              </li>
            </ul>
          </div>

          <SupportContact />
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { SiteCredit } from "@/components/marketing/site-credit";

export const metadata = { title: "Política de privacidade" };
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2 className="text-xl font-semibold text-default">{title}</h2><div className="mt-2 space-y-2">{children}</div></section>;

export default function PrivacyPage() {
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Scott English Academy";
  const document = process.env.NEXT_PUBLIC_COMPANY_DOCUMENT;
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return <main className="mx-auto max-w-3xl px-5 py-12 text-default">
    <Link href="/" className="text-sm text-brand-600 hover:underline">← Voltar para o início</Link>
    <h1 className="mt-6 text-3xl font-bold">Política de privacidade</h1>
    <p className="mt-2 text-sm text-muted">Última atualização: 2 de novembro de 2026.</p>
    <div className="mt-8 space-y-7 leading-relaxed text-muted">
      <p>Esta política explica como {company}{document ? `, inscrita sob o documento ${document}` : ""}, trata dados pessoais ao oferecer sua plataforma educacional.</p>
      <Section title="1. Dados tratados"><p>Podemos tratar nome, e-mail, telefone, documento, fotografia, senha protegida por hash, preferências da conta, matrículas, progresso, respostas e notas, certificados, agendamentos, mensagens de suporte e informações sobre pagamentos.</p><p>Também podemos registrar endereço IP, data e hora, navegador, dispositivo e eventos de segurança necessários ao funcionamento e à proteção da conta.</p></Section>
      <Section title="2. Para que usamos os dados"><p>Usamos os dados para criar e autenticar contas; entregar aulas e avaliações; registrar progresso e certificados; processar assinaturas; prestar suporte; enviar comunicações relacionadas ao serviço; prevenir fraude; manter segurança; e cumprir obrigações legais.</p><p>O tratamento pode se apoiar na execução do contrato, no cumprimento de obrigação legal, no exercício regular de direitos, no legítimo interesse avaliado e, quando necessário, no consentimento.</p></Section>
      <Section title="3. Compartilhamento"><p>Dados podem ser compartilhados, no limite necessário, com fornecedores de hospedagem, banco de dados, e-mail, monitoramento e pagamentos. Também podem ser fornecidos a autoridades quando houver obrigação legal ou ordem válida.</p><p>Alguns fornecedores podem operar em outros países. Nesses casos, adotamos medidas compatíveis com a legislação aplicável para proteger os dados.</p></Section>
      <Section title="4. Cookies e sessão"><p>A plataforma usa cookies ou tecnologias equivalentes para manter a sessão, proteger o login e lembrar preferências essenciais. Recursos opcionais de análise, se adotados, deverão ser informados de forma adequada.</p></Section>
      <Section title="5. Retenção e exclusão"><p>Conservamos os dados pelo tempo necessário para prestar o serviço, cumprir prazos legais, resolver disputas e proteger direitos. Após esse período, os dados são excluídos ou anonimizados, salvo quando a manutenção for permitida ou exigida por lei.</p></Section>
      <Section title="6. Segurança"><p>Aplicamos controles de acesso, proteção de credenciais, limitação de tentativas de login e outras medidas técnicas e administrativas proporcionais ao serviço. Nenhum sistema elimina todos os riscos; por isso, comunique imediatamente qualquer suspeita de uso indevido da conta.</p></Section>
      <Section title="7. Direitos do titular"><p>Nos termos da Lei Geral de Proteção de Dados, você pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação quando aplicável, portabilidade, informação sobre compartilhamentos e revisão de decisões automatizadas, além de revogar consentimentos.</p><p>Podemos solicitar informações adicionais para confirmar sua identidade antes de atender ao pedido.</p></Section>
      <Section title="8. Crianças e adolescentes"><p>O tratamento de dados de menores deve observar seu melhor interesse e a participação do responsável legal quando exigida. O responsável deve acompanhar o uso da conta e entrar em contato em caso de dúvida.</p></Section>
      <Section title="9. Contato e atualizações"><p>{email ? <>Solicitações sobre privacidade podem ser enviadas para <a className="text-brand-600 hover:underline" href={`mailto:${email}`}>{email}</a> ou pela Central de Ajuda.</> : <>Solicitações sobre privacidade podem ser enviadas pela Central de Ajuda disponível após o login.</>}</p><p>Esta política pode ser atualizada. Mudanças relevantes serão destacadas na plataforma, e a data da versão vigente permanecerá no início desta página.</p></Section>
    </div>
    <SiteCredit className="mt-12 border-t border-subtle pt-6 text-sm text-muted"/>
  </main>;
}

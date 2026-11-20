import Link from "next/link";
import { SiteCredit } from "@/components/marketing/site-credit";

export const metadata = { title: "Termos de uso" };
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <section><h2 className="text-xl font-semibold text-default">{title}</h2><div className="mt-2 space-y-2">{children}</div></section>;

export default function TermsPage() {
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Scott English Academy";
  const document = process.env.NEXT_PUBLIC_COMPANY_DOCUMENT;
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return <main className="mx-auto max-w-3xl px-5 py-12 text-default">
    <Link href="/" className="text-sm text-brand-600 hover:underline">← Voltar para o início</Link>
    <h1 className="mt-6 text-3xl font-bold">Termos de uso</h1>
    <p className="mt-2 text-sm text-muted">Última atualização: 2 de novembro de 2026.</p>
    <div className="mt-8 space-y-7 leading-relaxed text-muted">
      <p>Estes termos regulam o uso da plataforma educacional {company}{document ? `, inscrita sob o documento ${document}` : ""}. Ao criar uma conta ou usar o serviço, você declara que leu e concordou com estas condições.</p>
      <Section title="1. Conta e acesso"><p>Forneça dados corretos e mantenha sua senha em segurança. A conta é pessoal. Avise o suporte se suspeitar de acesso indevido. Pessoas menores de idade devem usar o serviço com a autorização e supervisão de seu responsável legal.</p></Section>
      <Section title="2. Serviço educacional"><p>Os cursos podem reunir aulas gravadas, encontros ao vivo, materiais, avaliações e certificados. A disponibilidade varia conforme o curso, a matrícula e o plano. Conteúdos e cronogramas podem ser atualizados por motivos pedagógicos ou operacionais.</p><p>Resultados de aprendizagem dependem de participação, prática e outros fatores individuais. A plataforma não promete nota, fluência ou resultado profissional específico.</p></Section>
      <Section title="3. Planos, pagamentos e cancelamento"><p>Preço, periodicidade e benefícios são apresentados antes da contratação. Quando houver cobrança real, ela será processada pelo provedor indicado no checkout. O cancelamento interrompe futuras renovações e preserva os direitos previstos na oferta e na legislação aplicável.</p><p>Pedidos de reembolso serão analisados conforme as condições da compra e os direitos do consumidor. O simples registro de um reembolso na plataforma não substitui a confirmação do provedor financeiro.</p></Section>
      <Section title="4. Conteúdo e propriedade intelectual"><p>Textos, vídeos, marcas, materiais e recursos da plataforma são protegidos. O acesso é concedido para estudo pessoal. Não é permitido copiar, vender, publicar, compartilhar credenciais ou redistribuir conteúdo sem autorização.</p></Section>
      <Section title="5. Uso adequado"><p>Você não deve tentar contornar controles de acesso, prejudicar o serviço, automatizar acessos abusivos, inserir código malicioso ou usar a plataforma para violar direitos de terceiros. O acesso pode ser suspenso quando necessário para proteger usuários e o serviço, com observância da legislação aplicável.</p></Section>
      <Section title="6. Disponibilidade"><p>Buscamos manter o serviço disponível e seguro, mas manutenções, falhas de fornecedores ou eventos fora de controle podem causar interrupções. Quando possível, mudanças relevantes serão comunicadas pelos canais da plataforma.</p></Section>
      <Section title="7. Privacidade"><p>O tratamento de dados pessoais é descrito na <Link href="/privacidade" className="text-brand-600 hover:underline">Política de privacidade</Link>.</p></Section>
      <Section title="8. Alterações e contato"><p>Estes termos podem ser atualizados para refletir mudanças no serviço ou na legislação. A versão vigente permanecerá publicada nesta página.</p><p>{email ? <>Dúvidas podem ser enviadas para <a className="text-brand-600 hover:underline" href={`mailto:${email}`}>{email}</a> ou pela Central de Ajuda.</> : <>Dúvidas podem ser enviadas pela Central de Ajuda disponível após o login.</>}</p></Section>
    </div>
    <SiteCredit className="mt-12 border-t border-subtle pt-6 text-sm text-muted"/>
  </main>;
}

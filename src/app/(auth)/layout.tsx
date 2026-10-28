import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh lg:grid-cols-2">
    <aside className="hidden flex-col justify-between border-r border-subtle bg-sunken p-12 lg:flex">
      <Link href="/" className="flex items-center gap-3 text-lg font-bold"><Image src="/icons/icon-96.png" alt="" width={48} height={48} />Scott English Academy</Link>
      <div className="max-w-lg space-y-6"><p className="text-sm font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">Seu próximo passo começa aqui</p><h2 className="text-5xl font-black leading-tight tracking-tight">Inglês para quem quer <span className="text-brand-600 dark:text-brand-300">FALAR.</span></h2><p className="text-lg text-muted">Cursos, conversação ao vivo e acompanhamento para você aprender com confiança, no seu ritmo.</p></div>
      <p className="text-sm text-subtle">Scott English Academy · Aprender. Praticar. Evoluir.</p>
    </aside>
    <div className="flex flex-col justify-center px-5 py-10 sm:px-10"><div className="mx-auto w-full max-w-md"><Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted hover:text-default"><ArrowLeft className="h-4 w-4" />Voltar ao início</Link><div className="surface-card p-6 sm:p-8">{children}</div></div></div>
  </main>;
}

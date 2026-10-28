import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  BookOpen,
  CalendarClock,
  Video,
  GraduationCap,
  FileCheck2,
  ChartNoAxesCombined,
  CreditCard,
  Award,
  Users,
  LibraryBig,
  Settings2,
  LifeBuoy,
  ClipboardList,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  exact?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const ROLE_LABEL: Record<Role, string> = {
  ALUNO: "Aluno",
  PROFESSOR: "Professor",
  EDITOR: "Editor de conteúdo",
  ADMIN: "Administrador",
};

export const navByRole: Record<Role, NavSection[]> = {
  ALUNO: [
    {
      title: "Aprender",
      items: [
        { label: "Início", href: "/app", icon: LayoutDashboard, exact: true },
        { label: "Meus cursos", href: "/app/cursos", icon: BookOpen },
        { label: "Aulas", href: "/app/aulas", icon: Video },
        { label: "Agenda ao vivo", href: "/app/agenda", icon: CalendarClock, badge: "Live" },
        { label: "Aulas particulares", href: "/app/particulares", icon: Video },
      ],
    },
    {
      title: "Avaliação",
      items: [
        { label: "Provas", href: "/app/provas", icon: FileCheck2 },
        { label: "Meu progresso", href: "/app/progresso", icon: ChartNoAxesCombined },
        { label: "Certificados", href: "/app/certificados", icon: Award },
      ],
    },
    {
      title: "Conta",
      items: [
        { label: "Assinatura", href: "/app/assinatura", icon: CreditCard },
        { label: "Pagamentos", href: "/app/pagamentos", icon: ClipboardList },
        { label: "Configurações", href: "/app/configuracoes", icon: Settings2 },
      ],
    },
  ],
  PROFESSOR: [
    {
      title: "Ensinar",
      items: [
        { label: "Visão geral", href: "/app", icon: LayoutDashboard, exact: true },
        { label: "Meus cursos", href: "/app/cursos", icon: BookOpen },
        { label: "Aulas ao vivo", href: "/app/agenda", icon: CalendarClock },
        { label: "Aulas particulares", href: "/app/particulares", icon: Video },
        { label: "Alunos", href: "/app/alunos", icon: Users },
      ],
    },
    {
      title: "Avaliação",
      items: [
        { label: "Provas", href: "/app/provas", icon: FileCheck2 },
        { label: "Correções", href: "/app/correcoes", icon: ClipboardList },
      ],
    },
    {
      title: "Conta",
      items: [
        { label: "Configurações", href: "/app/configuracoes", icon: Settings2 },
        { label: "Suporte", href: "/app/suporte", icon: LifeBuoy },
      ],
    },
  ],
  EDITOR: [
    {
      title: "Conteúdo",
      items: [
        { label: "Visão geral", href: "/app", icon: LayoutDashboard, exact: true },
        { label: "Biblioteca", href: "/app/biblioteca", icon: LibraryBig },
        { label: "Cursos", href: "/app/cursos", icon: BookOpen },
        { label: "Provas", href: "/app/provas", icon: FileCheck2 },
      ],
    },
    {
      title: "Conta",
      items: [
        { label: "Configurações", href: "/app/configuracoes", icon: Settings2 },
        { label: "Suporte", href: "/app/suporte", icon: LifeBuoy },
      ],
    },
  ],
  ADMIN: [
    {
      title: "Plataforma",
      items: [
        { label: "Visão geral", href: "/app", icon: LayoutDashboard, exact: true },
        { label: "Usuários", href: "/app/admin/usuarios", icon: Users },
        { label: "Cursos", href: "/app/cursos", icon: BookOpen },
        { label: "Biblioteca", href: "/app/biblioteca", icon: LibraryBig },
        { label: "Provas", href: "/app/provas", icon: FileCheck2 },
        { label: "Assinaturas", href: "/app/assinatura", icon: GraduationCap },
      ],
    },
    {
      title: "Operação",
      items: [
        { label: "Agenda ao vivo", href: "/app/agenda", icon: CalendarClock },
        { label: "Pagamentos", href: "/app/pagamentos", icon: CreditCard },
        { label: "Configurações", href: "/app/configuracoes", icon: Settings2 },
      ],
    },
  ],
};

export const ROLE_HOME: Record<Role, string> = {
  ALUNO: "/app",
  PROFESSOR: "/app",
  EDITOR: "/app",
  ADMIN: "/app",
};

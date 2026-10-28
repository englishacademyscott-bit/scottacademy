# Contrato técnico — Scott English Academy

## Stack (não mudar)
- Next.js 15.5.28, App Router, TypeScript strict, React 19
- Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` em `src/app/globals.css`) — **não** usar `tailwind.config.js`
- Prisma 6 + PostgreSQL (docker, porta 5432, db `academia`)
- next-auth v5 beta (Auth.js) — `auth()`, `signIn()`, `signOut()` de `@/lib/auth`
- Radix UI primitives, `lucide-react` ícones, `recharts` gráficos, `sonner` toasts
- shadcn-like components em `src/components/ui/*` (já prontos)

## Imports prontos (usar sempre)
```ts
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Select, Label, Field } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { EmptyState, SectionHeader, StatCard, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toaster";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/guards";
import { cn, formatCurrency, formatDuration, formatDateTime, formatDate, formatTime, initials, percentage } from "@/lib/utils";
import { Role } from "@prisma/client";
```

## Design system — tokens prontos
Cores: `brand` (indigo), `accent` (cyan), `pop` (laranja), `sun` (âmbar), `cherry` (vermelho), `ink` (neutros).
Utilitários custom (usar em vez de hex hardcoded):
- superfícies: `bg-canvas` `bg-surface` `bg-raised` `bg-sunken` `bg-sidebar`
- texto: `text-default` `text-muted` `text-subtle` `text-inverted`
- bordas: `border-subtle` `border-default` `border-strong`
- `surface-card` (card padrão), `gradient-brand`, `gradient-text`, `bg-grid`, `bg-dots`
- animação: `animate-fade-up` `animate-fade-in` `animate-scale-in` `animate-slide-in-right` `animate-pulse-ring`
- `shadow-soft` `shadow-lifted` `shadow-glow`

**Regras de UI (obrigatórias)**
1. Zero `bg-white`/`bg-gray-50`/`text-gray-700` hardcoded — usar tokens. Dark mode tem que funcionar.
2. Zero `<img>` — usar `next/image` ou CSS. Zero gradiente de texto sem fallback.
3. Ícones: sempre `lucide-react`, tamanho via `h-4 w-4` / `h-5 w-5`, nunca só texto.
4. Estados vazios sempre com `EmptyState`. Estados de loading com `Skeleton`.
5. Botões: `variant="primary"` (gradiente) para ação principal, `secondary` para secundária, `ghost` para terciária.
6. Tabelas → cards em mobile (grid responsivo), nunca scroll horizontal no corpo.
7. Animações só com `animate-*` / `transition-*`; respeitar `prefers-reduced-motion` (já global).

## Modelo de dados (Prisma)
`User` (role: ALUNO|PROFESSOR|EDITOR|ADMIN) · `Course` · `Module` · `Lesson` (kind: AULA_GRAVADA|AULA_AO_VIVO|AULA_PARTICULAR) · `LessonMaterial` · `LessonProgress` · `Enrollment` · `ScheduledSession` · `Plan` · `Subscription` · `Payment` · `Exam` · `Question` · `Option` · `ExamAttempt` · `ExamAnswer` · `Certificate` · `Review` · `Notification`

Relações importantes:
- `Course.teacherId → User`; `Module.courseId → Course`; `Lesson.moduleId → Module`
- `LessonProgress` unique `[studentId, lessonId]`
- `Enrollment` unique `[studentId, courseId]`
- `ScheduledSession`: `teacherId`, `studentId?`, `courseId?`, `startsAt`, `endsAt`, `status`
- `Exam.questions → Question → options`; `ExamAttempt.answers → ExamAnswer`

## Rotas
- `/` landing pública · `/login` · `/cadastro`
- `/app/*` autenticado (o layout já existe em `src/app/app/layout.tsx` e renderiza sidebar por role)
- Perfis: ALUNO (consome), PROFESSOR (ensina), EDITOR (conteúdo), ADMIN (tudo)

## Regras de sessão
- `requireUser()` → `{ id, name, email, role, image }`; redireciona `/login` se não logado
- `requireRole(["ADMIN"])` → idem + checagem de role
- Server Components por padrão; `"use client"` só onde precisa de estado/handlers
- Ações de escrita: Server Actions em `src/app/**/actions.ts` com `"use server"` no topo, revalidar com `revalidatePath`

## Idioma
Toda a interface em **português do Brasil**. Nome da marca: "Scott English Academy" / "SEA". Tagline: "Inglês para quem quer FALAR".

## Avisos
- Nunca alterar `prisma/schema.prisma`, `src/app/globals.css`, `src/components/ui/*`, `src/lib/prisma.ts`, `src/lib/auth.ts`, `src/lib/utils.ts`, `src/lib/nav.ts` — são compartilhados e podem estar sendo editados por outro agente em paralelo.
- Se precisar de um novo componente em `src/components/ui/`, criar com prefixo único do feature (ex.: `src/components/ui/calendar.tsx`) e avisar.

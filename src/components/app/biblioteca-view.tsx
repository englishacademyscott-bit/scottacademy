"use client";

import * as React from "react";
import * as Switch from "@radix-ui/react-switch";
import {
  Copy,
  FileStack,
  Link2,
  MoreVertical,
  Pencil,
  Trash2,
  Video,
  Clock,
  CircleCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { formatDuration } from "@/lib/utils";
import {
  deleteLesson,
  duplicateLesson,
  toggleLessonPublished,
  updateLesson,
} from "@/app/app/biblioteca/actions";

export interface LessonRow {
  id: string;
  title: string;
  description: string | null;
  kind: "AULA_GRAVADA" | "AULA_AO_VIVO" | "AULA_PARTICULAR";
  durationSec: number;
  videoUrl: string | null;
  published: boolean;
  free: boolean;
  position: number;
  moduleId: string;
  moduleTitle: string;
  modulePosition: number;
  courseId: string;
  courseTitle: string;
  materials: { id: string; title: string; kind: string; url: string }[];
  studentsReached: number;
}

const KIND_META: Record<LessonRow["kind"], { label: string; variant: "brand" | "accent" | "pop" }> = {
  AULA_GRAVADA: { label: "Gravada", variant: "brand" },
  AULA_AO_VIVO: { label: "Ao vivo", variant: "accent" },
  AULA_PARTICULAR: { label: "Particular", variant: "pop" },
};

function PublishSwitch({
  checked,
  onCheckedChange,
  lessonTitle,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  lessonTitle: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={checked ? `Despublicar ${lessonTitle}` : `Publicar ${lessonTitle}`}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-default bg-sunken transition-colors duration-200 focus-visible:outline-none focus-visible:ring-brand data-[state=checked]:gradient-brand disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Switch.Thumb className="pointer-events-none block h-4 w-4 translate-x-1 rounded-full bg-ink-100 shadow transition-transform duration-200 data-[state=checked]:translate-x-6 data-[state=checked]:bg-white" />
    </Switch.Root>
  );
}

export function BibliotecaView({ rows }: { rows: LessonRow[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<LessonRow | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<LessonRow | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = React.useState<LessonRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    kind: "AULA_GRAVADA" as LessonRow["kind"],
    durationMin: 0,
    videoUrl: "",
    published: false,
  });

  const openEdit = (lesson: LessonRow) => {
    setForm({
      title: lesson.title,
      description: lesson.description ?? "",
      kind: lesson.kind,
      durationMin: Math.round(lesson.durationSec / 60),
      videoUrl: lesson.videoUrl ?? "",
      published: lesson.published,
    });
    setEditing(lesson);
  };

  const handleToggle = async (lesson: LessonRow, published: boolean) => {
    setPendingId(lesson.id);
    const result = await toggleLessonPublished(lesson.id, published);
    setPendingId(null);
    if (result.ok) toast.success(result.message ?? "Feito.");
    else toast.error(result.error);
  };

  const saveLesson = async () => {
    if (!editing) return;
    setSaving(true);
    const result = await updateLesson({
      lessonId: editing.id,
      title: form.title,
      description: form.description,
      kind: form.kind,
      durationSec: Math.max(0, Math.round(form.durationMin)) * 60,
      videoUrl: form.videoUrl,
      published: form.published,
    });
    setSaving(false);
    if (result.ok) {
      toast.success(result.message ?? "Aula atualizada.");
      setEditing(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveLesson();
  };

  const handleDuplicate = async () => {
    if (!confirmDuplicate) return;
    setSaving(true);
    const result = await duplicateLesson(confirmDuplicate.id);
    setSaving(false);
    setConfirmDuplicate(null);
    if (result.ok) toast.success(result.message ?? "Aula duplicada.");
    else toast.error(result.error);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    const result = await deleteLesson(confirmDelete.id);
    setSaving(false);
    setConfirmDelete(null);
    if (result.ok) toast.success(result.message ?? "Aula excluída.");
    else toast.error(result.error);
  };

  return (
    <>
      {/* Tabela (desktop) */}
      <div className="hidden overflow-hidden rounded-xl border border-subtle bg-surface shadow-soft lg:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Biblioteca de aulas</caption>
          <thead>
            <tr className="border-b border-subtle bg-sunken text-left">
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Aula
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Tipo
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Duração
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Materiais
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-subtle">
                Publicada
              </th>
              <th scope="col" className="w-16 px-4 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lesson) => (
              <tr key={lesson.id} className="border-b border-subtle transition-colors last:border-0 hover:bg-sunken">
                <td className="px-4 py-3">
                  <p className="font-medium text-default">{lesson.title}</p>
                  <p className="text-xs text-muted">
                    {lesson.courseTitle} · {lesson.moduleTitle}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={KIND_META[lesson.kind].variant}>{KIND_META[lesson.kind].label}</Badge>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted">{formatDuration(lesson.durationSec)}</td>
                <td className="px-4 py-3">
                  {lesson.materials.length === 0 ? (
                    <span className="text-xs text-subtle">—</span>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-default">
                        <FileStack className="h-3.5 w-3.5 text-subtle" />
                        {lesson.materials.length}
                      </span>
                      <p className="max-w-[16rem] truncate text-xs text-subtle">
                        {lesson.materials.map((m) => m.title).join(", ")}
                      </p>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <PublishSwitch
                      checked={lesson.published}
                      onCheckedChange={(value) => handleToggle(lesson, value)}
                      lessonTitle={lesson.title}
                    />
                    <span className="text-xs font-medium text-muted">
                      {pendingId === lesson.id ? "Salvando…" : lesson.published ? "Sim" : "Não"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${lesson.title}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(lesson)}>
                        <Pencil className="h-4 w-4" /> Editar aula
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setConfirmDuplicate(lesson)}>
                        <Copy className="h-4 w-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setConfirmDelete(lesson)}>
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile/tablet) */}
      <div className="space-y-3 lg:hidden">
        {rows.map((lesson) => (
          <div key={lesson.id} className="rounded-xl border border-subtle bg-surface p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-default">{lesson.title}</p>
                <p className="text-xs text-muted">
                  {lesson.courseTitle} · {lesson.moduleTitle}
                </p>
              </div>
              <Badge variant={KIND_META[lesson.kind].variant}>{KIND_META[lesson.kind].label}</Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {formatDuration(lesson.durationSec)}
              </span>
              <span className="inline-flex items-center gap-1">
                <FileStack className="h-3.5 w-3.5" /> {lesson.materials.length} materiais
              </span>
              {lesson.videoUrl ? (
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3.5 w-3.5" /> vídeo
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-subtle pt-3">
              <div className="flex items-center gap-2">
                <PublishSwitch
                  checked={lesson.published}
                  onCheckedChange={(value) => handleToggle(lesson, value)}
                  lessonTitle={lesson.title}
                />
                <span className="text-xs font-medium text-muted">
                  {lesson.published ? "Publicada" : "Rascunho"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${lesson.title}`} onClick={() => openEdit(lesson)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Duplicar ${lesson.title}`}
                  onClick={() => setConfirmDuplicate(lesson)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${lesson.title}`}
                  onClick={() => setConfirmDelete(lesson)}
                >
                  <Trash2 className="h-4 w-4 text-cherry-500" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dialog de edição */}
      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar aula</DialogTitle>
            <DialogDescription>
              {editing ? `${editing.courseTitle} · ${editing.moduleTitle}` : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 px-6">
            <Field label="Título" hint="Nome da aula como o aluno verá.">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                minLength={3}
                maxLength={160}
              />
            </Field>

            <Field label="Descrição">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                maxLength={2000}
                placeholder="Do que trata esta aula?"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de aula">
                <Select
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as LessonRow["kind"] }))}
                >
                  <option value="AULA_GRAVADA">Gravada</option>
                  <option value="AULA_AO_VIVO">Ao vivo</option>
                  <option value="AULA_PARTICULAR">Particular</option>
                </Select>
              </Field>

              <Field label="Duração (minutos)">
                <Input
                  type="number"
                  min={0}
                  max={720}
                  value={form.durationMin}
                  onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                />
              </Field>
            </div>

            <Field label="URL do vídeo" hint="Link do player (YouTube, Vimeo, etc.).">
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <Input
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="https://..."
                  className="pl-9"
                />
              </div>
            </Field>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-subtle p-3">
              <div>
                <Label htmlFor="edit-published">Publicada</Label>
                <p className="text-xs text-subtle">Aulas publicadas ficam visíveis para os alunos.</p>
              </div>
              <PublishSwitch
                checked={form.published}
                onCheckedChange={(value) => setForm((f) => ({ ...f, published: value }))}
                lessonTitle={form.title || "aula"}
              />
            </div>

            {editing && editing.materials.length > 0 ? (
              <div className="rounded-lg border border-subtle p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Materiais</p>
                <ul className="space-y-1 text-xs text-muted">
                  {editing.materials.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <CircleCheck className="h-3.5 w-3.5 shrink-0 text-subtle" />
                      <span className="truncate">{m.title}</span>
                      <span className="ml-auto shrink-0 text-subtle">{m.kind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveLesson()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de duplicação */}
      <Dialog open={Boolean(confirmDuplicate)} onOpenChange={(open) => !open && setConfirmDuplicate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar aula?</DialogTitle>
            <DialogDescription>
              Uma cópia de “{confirmDuplicate?.title}” será criada no mesmo módulo como rascunho.
              Materiais e progresso dos alunos não são copiados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDuplicate(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicate} disabled={saving}>
              {saving ? "Duplicando…" : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir esta aula?</DialogTitle>
            <DialogDescription>
              “{confirmDelete?.title}” será removida permanentemente, junto com os materiais e o
              progresso registrado pelos alunos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Excluindo…" : "Excluir aula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

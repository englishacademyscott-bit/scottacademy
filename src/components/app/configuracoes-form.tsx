"use client";

import * as React from "react";
import { z } from "zod";
import {
  Bell,
  Check,
  KeyRound,
  Laptop,
  Moon,
  Palette,
  Save,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { changePassword, updatePreferences, updateProfile } from "@/app/app/configuracoes/actions";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(120, "Nome muito longo."),
  bio: z.string().trim().max(500, "Bio muito longa."),
  phone: z.string().trim().max(40, "Telefone inválido."),
  avatarUrl: z
    .union([z.literal(""), z.string().trim().url("Informe uma URL válida (https://...)")])
    .refine((v) => v === "" || v.startsWith("https://") || v.startsWith("http://"), {
      message: "A URL deve começar com http:// ou https://",
    }),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(6, "A nova senha precisa de ao menos 6 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Laptop },
] as const;

export function ConfiguracoesForm({
  profile,
  newsletter,
}: {
  profile: { name: string; email: string; bio: string; phone: string; avatarUrl: string };
  newsletter: boolean;
}) {
  const { theme, setTheme } = useTheme();

  const [form, setForm] = React.useState(profile);
  const [profileErrors, setProfileErrors] = React.useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = React.useState(false);

  const [passwords, setPasswords] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = React.useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = React.useState(false);

  const [wantsNews, setWantsNews] = React.useState(newsletter);
  const [savingPreferences, setSavingPreferences] = React.useState(false);

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      setProfileErrors(errors);
      toast.error("Revise os campos destacados.");
      return;
    }
    setProfileErrors({});
    setSavingProfile(true);
    const result = await updateProfile(parsed.data);
    setSavingProfile(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.error);
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = passwordSchema.safeParse(passwords);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      setPasswordErrors(errors);
      toast.error("Revise os campos destacados.");
      return;
    }
    setPasswordErrors({});
    setSavingPassword(true);
    const result = await changePassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    setSavingPassword(false);
    if (result.ok) {
      toast.success(result.message);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      toast.error(result.error);
    }
  };

  const handleNewsletter = async (value: boolean) => {
    const previous = wantsNews;
    setWantsNews(value);
    setSavingPreferences(true);
    const result = await updatePreferences({ newsletter: value });
    setSavingPreferences(false);
    if (result.ok) toast.success(result.message);
    else {
      setWantsNews(previous);
      toast.error(result.error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-brand-500" /> Dados do perfil
          </CardTitle>
          <CardDescription>Como você aparece na plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4" noValidate>
            <Field label="Nome completo" error={profileErrors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="name"
                aria-invalid={Boolean(profileErrors.name)}
              />
            </Field>

            <Field label="E-mail" hint="O e-mail de acesso não pode ser alterado.">
              <Input value={form.email} readOnly disabled aria-readonly="true" />
            </Field>

            <Field label="Telefone" hint="Opcional. Usado para avisos de aulas ao vivo." error={profileErrors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+55 11 90000-0000"
                autoComplete="tel"
                aria-invalid={Boolean(profileErrors.phone)}
              />
            </Field>

            <Field label="Foto (URL)" hint="Deixe em branco para usar as iniciais." error={profileErrors.avatarUrl}>
              <Input
                value={form.avatarUrl}
                onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://..."
                inputMode="url"
                aria-invalid={Boolean(profileErrors.avatarUrl)}
              />
            </Field>

            <Field label="Bio" hint="Fale um pouco sobre você (até 500 caracteres)." error={profileErrors.bio}>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
                maxLength={500}
                aria-invalid={Boolean(profileErrors.bio)}
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingProfile}>
                <Save className="h-4 w-4" />
                {savingProfile ? "Salvando…" : "Salvar perfil"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Senha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-brand-500" /> Trocar senha
            </CardTitle>
            <CardDescription>Informe a senha atual para definir uma nova.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              <Field label="Senha atual" error={passwordErrors.currentPassword}>
                <Input
                  type="password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                  autoComplete="current-password"
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                />
              </Field>

              <Field label="Nova senha" hint="Mínimo de 6 caracteres." error={passwordErrors.newPassword}>
                <Input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                  autoComplete="new-password"
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                />
              </Field>

              <Field label="Confirmar nova senha" error={passwordErrors.confirmPassword}>
                <Input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                  autoComplete="new-password"
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                />
              </Field>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-subtle bg-sunken p-3">
                <p className="flex items-center gap-2 text-xs text-muted">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  Sua senha é armazenada criptografada.
                </p>
                <Button type="submit" disabled={savingPassword}>
                  <Save className="h-4 w-4" />
                  {savingPassword ? "Alterando…" : "Alterar senha"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-brand-500" /> Preferências
            </CardTitle>
            <CardDescription>Tema da interface e novidades da academia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tema</legend>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                        active
                          ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-200"
                          : "border-subtle bg-surface text-muted hover:bg-sunken hover:text-default",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-subtle p-4">
              <div className="min-w-0">
                <Label htmlFor="newsletter" className="flex items-center gap-1.5 normal-case">
                  <Bell className="h-3.5 w-3.5" /> Receber novidades
                </Label>
                <p className="mt-1 text-xs text-muted">
                  Envie-mails sobre novos cursos, aulas ao vivo e materiais exclusivos.
                </p>
              </div>
              <input
                id="newsletter"
                type="checkbox"
                checked={wantsNews}
                disabled={savingPreferences}
                onChange={(e) => handleNewsletter(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-default text-brand-600 accent-[var(--color-brand-500)] focus-visible:ring-brand"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

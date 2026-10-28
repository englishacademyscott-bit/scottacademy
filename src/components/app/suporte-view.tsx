"use client";

import * as React from "react";
import { z } from "zod";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { sendSupportMessage } from "@/app/app/suporte/actions";

const schema = z.object({
  subject: z.string().trim().min(3, "Informe um assunto."),
  message: z.string().trim().min(10, "Descreva sua dúvida com pelo menos 10 caracteres."),
});

export function SupportContact() {
  const [form, setForm] = React.useState({ subject: "", message: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [sending, setSending] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Revise os campos destacados.");
      return;
    }
    setErrors({});
    setSending(true);
    const result = await sendSupportMessage(parsed.data);
    setSending(false);
    if (result.ok) {
      toast.success(result.message);
      setForm({ subject: "", message: "" });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-subtle bg-surface p-5 shadow-soft"
    >
      <div>
        <h2 className="text-base font-bold tracking-tight text-default">Enviar uma mensagem</h2>
        <p className="mt-1 text-sm text-muted">Descreva o que precisa e a gente resolve.</p>
      </div>

      <Field label="Assunto" error={errors.subject}>
        <Input
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          placeholder="Ex.: Não consigo acessar a aula de hoje"
          aria-invalid={Boolean(errors.subject)}
          maxLength={120}
        />
      </Field>

      <Field label="Mensagem" error={errors.message}>
        <Textarea
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="Conte com detalhes o que está acontecendo."
          rows={5}
          maxLength={4000}
          aria-invalid={Boolean(errors.message)}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={sending}>
        <Send className="h-4 w-4" />
        {sending ? "Enviando…" : "Enviar mensagem"}
      </Button>
    </form>
  );
}

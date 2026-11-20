type EmailResult = { sent: true } | { sent: false; reason: "not-configured" | "provider-error" };

export async function sendPasswordResetEmail(input: { to: string; name: string; resetUrl: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not-configured" };
  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const logo = appUrl ? `${appUrl}/icons/icon-96.png` : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: "Redefina sua senha — Scott English Academy",
      html: `<div style="margin:0;background:#f8fafc;padding:32px 16px;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:auto;overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#fff"><div style="height:6px;background:linear-gradient(90deg,#ec4899,#7c3aed,#2563eb)"></div><div style="padding:30px">${logo ? `<img src="${escapeHtml(logo)}" width="48" height="48" alt="" style="border-radius:12px">` : ""}<p style="margin:14px 0 0;color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:.12em">SCOTT ENGLISH ACADEMY</p><h1 style="margin:8px 0 20px;font-size:26px;line-height:1.2">Crie uma nova senha</h1><p>Olá, ${escapeHtml(input.name)}.</p><p style="line-height:1.6;color:#475569">Recebemos uma solicitação para redefinir a senha da sua conta. Por segurança, este link expira em 30 minutos e só pode ser usado uma vez.</p><p style="margin:26px 0"><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#7c3aed;color:white;padding:13px 20px;border-radius:10px;text-decoration:none;font-weight:700">Redefinir minha senha</a></p><p style="font-size:13px;line-height:1.5;color:#64748b">Se você não solicitou a alteração, ignore esta mensagem. Sua senha atual continuará válida.</p></div><div style="border-top:1px solid #e2e8f0;padding:18px 30px;font-size:12px;color:#94a3b8">Aprender. Praticar. Evoluir.</div></div></div>`,
    }),
  });
  return response.ok ? { sent: true } : { sent: false, reason: "provider-error" };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}

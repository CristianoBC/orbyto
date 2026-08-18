const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]!);

export function passwordResetTemplate(name: string | null | undefined, resetUrl: string, expiresInMinutes: number) {
  const safeName = name?.trim() ? escapeHtml(name.trim()) : null;
  const safeUrl = escapeHtml(resetUrl);
  const greeting = safeName ? `Olá, ${safeName}.` : 'Olá.';

  return {
    subject: 'Recuperação de senha — Orbyto',
    text: `${greeting}\n\nRecebemos uma solicitação para redefinir sua senha no Orbyto.\n\nAcesse o link abaixo em até ${expiresInMinutes} minutos:\n${resetUrl}\n\nSe você não solicitou esta alteração, ignore este e-mail.`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:16px"><tr><td style="height:6px;background:linear-gradient(135deg,#6d4cff 0%,#8b5cf6 45%,#ff6b4a 100%);border-radius:16px 16px 0 0"></td></tr><tr><td style="padding:36px"><p style="margin:0 0 8px;color:#6d4cff;font-weight:700">ORBYTO</p><h1 style="margin:0 0 24px;font-size:24px">Recuperação de senha</h1><p>${greeting}</p><p>Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo em até <strong>${expiresInMinutes} minutos</strong>.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#6d4cff;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Redefinir minha senha</a></p><p style="color:#64748b;font-size:14px">Se o botão não funcionar, copie este link:<br><a href="${safeUrl}" style="color:#6d4cff;word-break:break-all">${safeUrl}</a></p><p style="margin-top:28px;color:#64748b;font-size:14px">Se você não solicitou esta alteração, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

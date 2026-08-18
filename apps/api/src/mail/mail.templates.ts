const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character]!,
  );

export function deadlineAlertSummaryTemplate(
  name: string | null | undefined,
  overdue: Array<{ title: string; kind: string; dueDate: string; url: string }>,
  upcoming: Array<{
    title: string;
    kind: string;
    dueDate: string;
    url: string;
  }>,
  dashboardUrl: string,
) {
  const greeting = name?.trim() ? `Olá, ${name.trim()}.` : 'Olá.';
  const textList = (items: typeof overdue) =>
    items
      .map(
        (item) =>
          `- ${item.kind}: ${item.title} (prazo: ${item.dueDate})\n  ${item.url}`,
      )
      .join('\n');
  const htmlList = (items: typeof overdue) =>
    items
      .map(
        (item) =>
          `<li style="margin:0 0 12px"><strong>${escapeHtml(item.kind)}:</strong> <a href="${escapeHtml(item.url)}" style="color:#6d4cff">${escapeHtml(item.title)}</a><br><span style="color:#64748b">Prazo: ${escapeHtml(item.dueDate)}</span></li>`,
      )
      .join('');
  const safeDashboardUrl = escapeHtml(dashboardUrl);
  return {
    subject: 'Resumo diário de prazos — Orbyto',
    text: `${greeting}\n\nItens vencidos\n${textList(overdue) || 'Nenhum.'}\n\nPróximos do prazo\n${textList(upcoming) || 'Nenhum.'}\n\nAcesse o Orbyto: ${dashboardUrl}`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" style="max-width:640px;background:#fff;border:1px solid #e5e7eb;border-radius:16px"><tr><td style="height:6px;background:linear-gradient(135deg,#6d4cff,#8b5cf6 45%,#ff6b4a);border-radius:16px 16px 0 0"></td></tr><tr><td style="padding:36px"><p style="margin:0 0 8px;color:#6d4cff;font-weight:700">ORBYTO</p><h1 style="margin:0 0 24px;font-size:24px">Itens vencidos e próximos do prazo</h1><p>${escapeHtml(greeting)}</p>${overdue.length ? `<h2 style="font-size:18px;color:#b91c1c">Vencidos (${overdue.length})</h2><ul>${htmlList(overdue)}</ul>` : ''}${upcoming.length ? `<h2 style="font-size:18px;color:#b45309">Próximos do prazo (${upcoming.length})</h2><ul>${htmlList(upcoming)}</ul>` : ''}<p style="margin:28px 0 0"><a href="${safeDashboardUrl}" style="display:inline-block;padding:14px 22px;background:#6d4cff;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Acessar o Orbyto</a></p></td></tr></table></td></tr></table></body></html>`,
  };
}

export function operationalTemplate(
  subject: string,
  heading: string,
  name: string | null | undefined,
  fields: Array<{ label: string; value: string | null | undefined }>,
  url: string,
) {
  const greeting = name?.trim() ? `Olá, ${name.trim()}.` : 'Olá.';
  const visibleFields = fields.filter((field) => field.value?.trim());
  const textFields = visibleFields
    .map((field) => `${field.label}: ${field.value}`)
    .join('\n');
  const htmlFields = visibleFields
    .map(
      (field) =>
        `<tr><td style="padding:7px 12px;color:#64748b">${escapeHtml(field.label)}</td><td style="padding:7px 12px;font-weight:600">${escapeHtml(field.value!)}</td></tr>`,
    )
    .join('');
  const safeUrl = escapeHtml(url);
  return {
    subject,
    text: `${greeting}\n\n${heading}\n\n${textFields}\n\nAcessar no Orbyto: ${url}`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:16px"><tr><td style="height:6px;background:linear-gradient(135deg,#6d4cff,#8b5cf6 45%,#ff6b4a);border-radius:16px 16px 0 0"></td></tr><tr><td style="padding:36px"><p style="margin:0 0 8px;color:#6d4cff;font-weight:700">ORBYTO</p><h1 style="margin:0 0 24px;font-size:24px">${escapeHtml(heading)}</h1><p>${escapeHtml(greeting)}</p><table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse">${htmlFields}</table><p style="margin:28px 0 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#6d4cff;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Acessar no Orbyto</a></p></td></tr></table></td></tr></table></body></html>`,
  };
}

export function passwordResetTemplate(
  name: string | null | undefined,
  resetUrl: string,
  expiresInMinutes: number,
) {
  const safeName = name?.trim() ? escapeHtml(name.trim()) : null;
  const safeUrl = escapeHtml(resetUrl);
  const greeting = safeName ? `Olá, ${safeName}.` : 'Olá.';

  return {
    subject: 'Recuperação de senha — Orbyto',
    text: `${greeting}\n\nRecebemos uma solicitação para redefinir sua senha no Orbyto.\n\nAcesse o link abaixo em até ${expiresInMinutes} minutos:\n${resetUrl}\n\nSe você não solicitou esta alteração, ignore este e-mail.`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:16px"><tr><td style="height:6px;background:linear-gradient(135deg,#6d4cff 0%,#8b5cf6 45%,#ff6b4a 100%);border-radius:16px 16px 0 0"></td></tr><tr><td style="padding:36px"><p style="margin:0 0 8px;color:#6d4cff;font-weight:700">ORBYTO</p><h1 style="margin:0 0 24px;font-size:24px">Recuperação de senha</h1><p>${greeting}</p><p>Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo em até <strong>${expiresInMinutes} minutos</strong>.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#6d4cff;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Redefinir minha senha</a></p><p style="color:#64748b;font-size:14px">Se o botão não funcionar, copie este link:<br><a href="${safeUrl}" style="color:#6d4cff;word-break:break-all">${safeUrl}</a></p><p style="margin-top:28px;color:#64748b;font-size:14px">Se você não solicitou esta alteração, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

export function userInvitationTemplate(
  name: string,
  inviteUrl: string,
  expiresInHours: number,
) {
  const safeName = escapeHtml(name.trim());
  const safeUrl = escapeHtml(inviteUrl);
  return {
    subject: 'Convite para acessar o Orbyto',
    text: `Olá, ${name.trim()}.\n\nVocê foi convidado para acessar o Orbyto. Defina sua senha pelo link abaixo em até ${expiresInHours} horas:\n${inviteUrl}\n\nSe você não reconhece este convite, ignore este e-mail.`,
    html: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:16px"><tr><td style="height:6px;background:linear-gradient(135deg,#6d4cff 0%,#8b5cf6 45%,#ff6b4a 100%);border-radius:16px 16px 0 0"></td></tr><tr><td style="padding:36px"><p style="margin:0 0 8px;color:#6d4cff;font-weight:700">ORBYTO</p><h1 style="margin:0 0 24px;font-size:24px">Você recebeu um convite</h1><p>Olá, ${safeName}.</p><p>Você foi convidado para acessar o Orbyto. Use o botão abaixo para definir sua senha em até <strong>${expiresInHours} horas</strong>.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#6d4cff;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Aceitar convite</a></p><p style="color:#64748b;font-size:14px">Se o botão não funcionar, copie este link:<br><a href="${safeUrl}" style="color:#6d4cff;word-break:break-all">${safeUrl}</a></p><p style="margin-top:28px;color:#64748b;font-size:14px">Se você não reconhece este convite, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

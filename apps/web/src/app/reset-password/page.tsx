'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PublicAuthCard } from '@/components/auth/public-auth-card';
import { apiRequest } from '@/lib/api';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? '';
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    apiRequest<{ valid: boolean }>(`/auth/validate-reset-token?token=${encodeURIComponent(token)}`, { authenticated: false })
      .then((result) => setValid(result.valid)).catch(() => setValid(false));
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (password !== confirmation) { setError('A confirmação de senha não corresponde.'); return; }
    setLoading(true);
    try {
      const result = await apiRequest<{ message: string }>('/auth/reset-password', { method: 'POST', authenticated: false, body: { token, newPassword: password } });
      setSuccess(result.message); setValid(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível redefinir a senha.');
    } finally { setLoading(false); }
  }

  if (valid === null) return <div className="screen-loader compact"><span className="spinner" />Validando link...</div>;
  if (success) return <div className="alert success">{success} <Link href="/login">Voltar para o login</Link></div>;
  if (!valid) return <div className="alert error">Este link é inválido, expirou ou já foi utilizado. <Link href="/forgot-password">Solicitar outro link</Link></div>;
  return <form className="public-auth-form" onSubmit={submit}>
    {error && <div className="alert error">{error}</div>}
    <label>Nova senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} required autoFocus /></label>
    <small className="password-hint">Use letras, números e caractere especial.</small>
    <label>Confirmar nova senha<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={72} required /></label>
    <button className="button primary full" disabled={loading} aria-busy={loading}>{loading ? 'Redefinindo...' : 'Redefinir senha'}</button>
  </form>;
}

export default function ResetPasswordPage() {
  return <PublicAuthCard eyebrow="Nova credencial" title="Redefinir senha" text="Crie uma nova senha segura para acessar o Orbyto.">
    <Suspense fallback={<div className="screen-loader compact"><span className="spinner" />Carregando...</div>}><ResetPasswordForm /></Suspense>
    <p className="auth-back-link"><Link href="/login">Voltar ao login</Link></p>
  </PublicAuthCard>;
}

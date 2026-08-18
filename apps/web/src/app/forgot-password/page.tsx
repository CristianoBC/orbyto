'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { PublicAuthCard } from '@/components/auth/public-auth-card';
import { apiRequest } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try {
      const result = await apiRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', authenticated: false, body: { email } });
      setMessage(result.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível solicitar a recuperação.');
    } finally { setLoading(false); }
  }

  return <PublicAuthCard eyebrow="Recuperação de acesso" title="Esqueci minha senha" text="Informe seu e-mail institucional para receber as instruções de recuperação.">
    {error && <div className="alert error">{error}</div>}
    {message && <div className="alert success">{message} Verifique sua caixa de entrada e a pasta de spam.</div>}
    <form className="public-auth-form" onSubmit={submit}>
      <label>E-mail institucional<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nome@colsan.org.br" maxLength={320} required autoFocus /></label>
      <button className="button primary full" disabled={loading} aria-busy={loading}>{loading ? 'Solicitando...' : 'Recuperar senha'}</button>
    </form>
    <p className="auth-back-link"><Link href="/login">Voltar ao login</Link></p>
  </PublicAuthCard>;
}

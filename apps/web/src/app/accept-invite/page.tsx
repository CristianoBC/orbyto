'use client';
import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PublicAuthCard } from '@/components/auth/public-auth-card';
import { apiRequest } from '@/lib/api';

type Validation = { valid: boolean; reason?: 'invalid' | 'expired' | 'used'; user?: { name: string; email: string } };
const reasons = { invalid: 'Este convite é inválido.', expired: 'Este convite expirou. Solicite um novo convite ao administrador.', used: 'Este convite já foi utilizado.' };

function InviteForm() {
  const token = useSearchParams().get('token') ?? '';
  const [validation, setValidation] = useState<Validation | null>(null);
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!token) setValidation({ valid: false, reason: 'invalid' }); else apiRequest<Validation>(`/auth/validate-invite-token?token=${encodeURIComponent(token)}`, { authenticated: false }).then(setValidation).catch(() => setValidation({ valid: false, reason: 'invalid' })); }, [token]);
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); if (password !== confirmation) return setError('A confirmação de senha não corresponde.'); if (!/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/.test(password)) return setError('Use ao menos 8 caracteres, com letras, números e caractere especial.'); setLoading(true); try { const result = await apiRequest<{ message: string }>('/auth/accept-invite', { method: 'POST', authenticated: false, body: { token, newPassword: password } }); setSuccess(result.message); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível aceitar o convite.'); } finally { setLoading(false); } }
  if (!validation) return <div className="screen-loader compact"><span className="spinner" />Validando convite...</div>;
  if (success) return <div className="alert success">{success} <Link href="/login">Entrar no Orbyto</Link></div>;
  if (!validation.valid) return <div className="alert error">{reasons[validation.reason ?? 'invalid']} <Link href="/login">Voltar ao login</Link></div>;
  return <><div className="invite-recipient"><strong>{validation.user?.name}</strong><span>{validation.user?.email}</span></div><form className="public-auth-form" onSubmit={submit}>{error && <div className="alert error">{error}</div>}<label>Crie sua senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required autoFocus /></label><small className="password-hint">Use letras, números e caractere especial.</small><label>Confirmar senha<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required /></label><button className="button primary full" disabled={loading}>{loading ? 'Ativando acesso...' : 'Aceitar convite'}</button></form></>;
}
export default function AcceptInvitePage() { return <PublicAuthCard eyebrow="Bem-vindo ao Orbyto" title="Aceitar convite" text="Defina uma senha segura para ativar seu acesso."><Suspense fallback={<div className="screen-loader compact"><span className="spinner" />Carregando...</div>}><InviteForm /></Suspense><p className="auth-back-link"><Link href="/login">Voltar ao login</Link></p></PublicAuthCard>; }

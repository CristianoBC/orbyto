'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';

export default function LoginPage() {
  const { login, user, loading: checking } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!checking && user) router.replace('/dashboard'); }, [checking, user, router]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); router.replace('/dashboard'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  }
  return <main className="login-page"><section className="login-intro"><div className="intro-content"><div className="login-brand"><Image src="/orbyto-logo.png" alt="Símbolo Orbyto" width={82} height={82} priority /><div><strong>Orbyto</strong><span>Plataforma de Gestão de Projetos e Ordens de Serviço</span></div></div><p className="eyebrow">Gestão que conecta</p><h1>Projetos claros.<br />Equipes alinhadas.</h1><p>Centralize demandas, acompanhe entregas e transforme o trabalho da sua equipe em resultados.</p><div className="login-points"><span>✓ Visão unificada</span><span>✓ Fluxos organizados</span><span>✓ Decisões mais rápidas</span></div></div></section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}><div className="mobile-brand"><Image src="/orbyto-logo.png" alt="Símbolo Orbyto" width={46} height={46} /><div><strong>Orbyto</strong><small>Gestão de projetos e ordens de serviço</small></div></div><p className="eyebrow">Bem-vindo de volta</p><h2>Acesse sua conta</h2><p className="muted">Informe suas credenciais corporativas para continuar.</p>
      {error && <div className="alert error">{error}</div>}
      <label>E-mail<input type="email" placeholder="nome@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
      <label>Senha<input type="password" placeholder="Digite sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></label>
      <button className="button primary full" disabled={loading}>{loading ? <><span className="spinner light" />Entrando...</> : 'Entrar →'}</button>
      <small className="login-help">Problemas para acessar? Contate o administrador do ambiente.</small>
    </form></section></main>;
}

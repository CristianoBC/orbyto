'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getRequiredModule, hasReportsAccess } from '@/lib/permissions';

export function ProtectedRoute({ children, area = 'any' }: { children: React.ReactNode; area?: 'any' | 'admin' | 'requester' }) {
  const { user, loading, can, logout, homeRoute, permissions } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const required = getRequiredModule(pathname);
  const wrongArea = !!user && ((area === 'admin' && (user.role === 'REQUESTER' || (required && !can(required)) || (pathname.startsWith('/reports') && !hasReportsAccess(user.role, permissions)) || (pathname.startsWith('/permissions') && !can('USERS', 'manage')))) || (area === 'requester' && (user.role !== 'REQUESTER' || !can('REQUESTER_PORTAL'))));
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    else if (!loading && user?.mustChangePassword && pathname !== '/change-password') router.replace('/change-password');
  }, [loading, user, router, pathname]);
  if (loading || !user) return <div className="screen-loader"><span className="spinner" />Verificando acesso...</div>;
  if (user.mustChangePassword && pathname !== '/change-password') return <div className="screen-loader"><span className="spinner" />Redirecionando para a troca de senha...</div>;
  if (wrongArea) return <main className="access-denied-page">
    <header className="access-denied-header">
      <div className="access-denied-brand"><Image src="/orbyto-logo.png" alt="" width={44} height={44} priority /><div><strong>Orbyto</strong><small>Área segura</small></div></div>
      <div className="access-denied-user"><span>{user.name}</span><button className="button ghost small" onClick={logout}>Sair</button></div>
    </header>
    <section className="access-denied-card">
      <div className="access-denied-icon" aria-hidden="true">!</div>
      <p className="eyebrow">Permissões de acesso</p>
      <h1>Acesso não permitido</h1>
      <p className="muted">Você não possui permissão para acessar esta área.</p>
      <div className="access-denied-actions">
        <button className="button ghost" onClick={() => router.back()}>Voltar</button>
        <button className="button primary" disabled={!homeRoute} onClick={() => homeRoute && router.replace(homeRoute)}>Ir para minha área</button>
        <button className="button ghost" onClick={logout}>Sair</button>
      </div>
    </section>
  </main>;
  return children;
}

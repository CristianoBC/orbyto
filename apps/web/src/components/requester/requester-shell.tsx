'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { NotificationMenu } from '@/components/notifications/notification-menu';

export function RequesterShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const initials = user?.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return <div className="requester-shell">
    <header className="requester-header">
      <div className="requester-header-inner">
        <Link className="requester-brand" href="/requester/service-orders" aria-label="Orbyto - portal do solicitante">
          <Image src="/orbyto-logo.png" alt="" width={42} height={42} priority />
          <div><strong>Orbyto</strong><small>Portal do Solicitante</small></div>
        </Link>
        <nav aria-label="Navegação do solicitante">
          <Link className={pathname === '/requester/service-orders' ? 'active' : ''} href="/requester/service-orders">Minhas solicitações</Link>
          <Link className={pathname === '/requester/service-orders/new' ? 'active' : ''} href="/requester/service-orders/new">Nova solicitação</Link>
        </nav>
        <NotificationMenu requester />
        <div className="requester-user"><span className="avatar">{initials}</span><div><strong>{user?.name}</strong><small>{user?.email}</small></div><Link className="button ghost small" href="/change-password">Senha</Link><button className="button ghost small" onClick={logout}>Sair</button></div>
      </div>
    </header>
    <main className="requester-content">{children}</main>
  </div>;
}

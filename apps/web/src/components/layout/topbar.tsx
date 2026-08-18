'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { labels } from '@/components/ui/page-state';
import { NotificationMenu } from '@/components/notifications/notification-menu';

export function Topbar({ onMenu }: { onMenu(): void }) {
  const { user, logout } = useAuth();
  const initials = user?.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <header className="topbar">
    <button className="menu-button" onClick={onMenu} aria-label="Abrir menu">☰</button>
    <div className="topbar-title"><strong>Olá, {user?.name.split(' ')[0]}</strong><span>Bem-vindo ao seu espaço de trabalho no Orbyto</span></div>
    <div className="topbar-actions"><NotificationMenu /><Link className="button ghost small" href="/profile">Meu Perfil</Link><div className="user-menu"><span className="avatar">{initials}</span><div><strong>{user?.name}</strong><small>{user?.role ? labels[user.role] : ''}</small></div><button className="button ghost small" onClick={logout}>Sair</button></div></div>
  </header>;
}

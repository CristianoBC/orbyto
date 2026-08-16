'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { PermissionModule } from '@/types/auth';

const items: readonly [string, string, string, PermissionModule][] = [
  ['/dashboard', '◦', 'Dashboard', 'DASHBOARD'], ['/service-orders', '◁', 'Ordens de Serviço', 'SERVICE_ORDERS'],
  ['/projects', '◇', 'Projetos', 'PROJECTS'], ['/schedule', '▥', 'Cronograma', 'SCHEDULE'], ['/tasks', '✓', 'Tarefas', 'TASKS'],
  ['/daily-logs', '▷', 'Registros Diários', 'DAILY_LOGS'], ['/users', '♙', 'Usuários', 'USERS'], ['/permissions', '⚙', 'Permissões', 'USERS'],
];

export function Sidebar({ open, onClose }: { open: boolean; onClose(): void }) {
  const pathname = usePathname(); const { can, user } = useAuth();
  const visible = items.filter(([href, , , module]) => can(module) && (href !== '/permissions' || (['OWNER', 'ADMIN'].includes(user?.role ?? '') && can('USERS', 'manage'))));
  return <>
    {open && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Link href={visible[0]?.[0] ?? '/login'} className="brand" onClick={onClose} aria-label="Orbyto - início"><span className="brand-mark"><Image src="/orbyto-logo.png" alt="" width={48} height={48} priority /></span><div><strong>Orbyto</strong><small>Plataforma de Gestão de Projetos e Ordens de Serviço</small></div></Link>
      <nav>{visible.map(([href, icon, label]) => <Link key={href} href={href} onClick={onClose} className={pathname === href || pathname.startsWith(`${href}/`) ? 'active' : ''}><b>{icon}</b>{label}</Link>)}</nav>
      <div className="sidebar-foot"><span>✦</span><div><strong>Ambiente corporativo</strong><small>Gestão conectada e eficiente</small></div></div>
    </aside>
  </>;
}

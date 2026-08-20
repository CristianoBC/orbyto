'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { hasReportsAccess } from '@/lib/permissions';
import type { PermissionModule } from '@/types/auth';

const items: readonly [string, string, string, PermissionModule][] = [
  ['/audit-logs', '◉', 'Auditoria', 'USERS'],
  ['/dashboard', '◦', 'Dashboard', 'DASHBOARD'], ['/service-orders', '◁', 'Ordens de Serviço', 'SERVICE_ORDERS'],
  ['/projects', '◇', 'Projetos', 'PROJECTS'], ['/schedule', '▥', 'Cronograma', 'SCHEDULE'], ['/tasks', '✓', 'Tarefas', 'TASKS'],
  ['/daily-logs', '▷', 'Registros Diários', 'DAILY_LOGS'], ['/users', '♙', 'Usuários', 'USERS'], ['/permissions', '⚙', 'Permissões', 'USERS'],
  ['/settings', '⚙', 'Configurações', 'SETTINGS'],
  ['/lookups', '▦', 'Cadastros Auxiliares', 'LOOKUPS'],
  ['/satisfaction', '★', 'Satisfação', 'SATISFACTION'],
];

export function Sidebar({ open, onClose }: { open: boolean; onClose(): void }) {
  const pathname = usePathname(); const { can, user, permissions } = useAuth();
  const visible = items.filter(([href, , , module]) => can(module) && (!['/permissions', '/audit-logs'].includes(href) || ['OWNER', 'ADMIN'].includes(user?.role ?? '')) && (href !== '/permissions' || can('USERS', 'manage')));
  const navigation = hasReportsAccess(user?.role, permissions)
    ? [...visible.slice(0, 1), ['/reports', '▤', 'Relatórios', 'DASHBOARD'] as const, ...visible.slice(1)]
    : visible;
  return <>
    {open && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Link href={navigation[0]?.[0] ?? '/login'} className="brand" onClick={onClose} aria-label="Orbyto - início"><span className="brand-mark"><Image src="/orbyto-logo.png" alt="" width={48} height={48} priority /></span><div><strong>Orbyto</strong><small>Plataforma de Gestão de Projetos e Ordens de Serviço</small></div></Link>
      <nav>{navigation.map(([href, icon, label]) => <Link key={href} href={href} onClick={onClose} className={pathname === href || pathname.startsWith(`${href}/`) ? 'active' : ''}><b>{icon}</b>{label}</Link>)}</nav>
      <div className="sidebar-foot"><span>✦</span><div><strong>Ambiente corporativo</strong><small>Gestão conectada e eficiente</small></div></div>
    </aside>
  </>;
}

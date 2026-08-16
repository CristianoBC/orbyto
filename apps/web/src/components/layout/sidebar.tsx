'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const items = [
  ['/dashboard', '▦', 'Dashboard'], ['/service-orders', '▤', 'Ordens de Serviço'],
  ['/projects', '◇', 'Projetos'], ['/schedule', '▥', 'Cronograma'], ['/tasks', '✓', 'Tarefas'],
  ['/daily-logs', '◷', 'Registros Diários'], ['/users', '♙', 'Usuários'],
] as const;

export function Sidebar({ open, onClose }: { open: boolean; onClose(): void }) {
  const pathname = usePathname();
  return <>
    {open && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={onClose} />}
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <Link href="/dashboard" className="brand" onClick={onClose} aria-label="Orbyto - início">
        <span className="brand-mark"><Image src="/orbyto-logo.png" alt="" width={48} height={48} priority /></span>
        <div><strong>Orbyto</strong><small>Plataforma de Gestão de Projetos e Ordens de Serviço</small></div>
      </Link>
      <nav>{items.map(([href, icon, label]) => <Link key={href} href={href} onClick={onClose} className={pathname === href || pathname.startsWith(`${href}/`) ? 'active' : ''}><b>{icon}</b>{label}</Link>)}</nav>
      <div className="sidebar-foot"><span>✦</span><div><strong>Ambiente corporativo</strong><small>Gestão conectada e eficiente</small></div></div>
    </aside>
  </>;
}

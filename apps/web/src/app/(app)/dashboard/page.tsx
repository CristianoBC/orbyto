'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

const shortcuts = [
  { href: '/service-orders', icon: '▤', title: 'Ordens de Serviço', text: 'Abra e acompanhe suas solicitações', color: 'blue' },
  { href: '/projects', icon: '◇', title: 'Projetos', text: 'Organize iniciativas e entregas', color: 'violet' },
  { href: '/tasks', icon: '✓', title: 'Tarefas', text: 'Veja suas prioridades e prazos', color: 'green' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  return <><div className="page-heading"><div><p className="eyebrow">Orbyto · Visão geral</p><h1>Dashboard</h1><p>Acompanhe seu trabalho e acesse rapidamente o que importa.</p></div><span className="date-chip">Hoje · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date())}</span></div>
    <section className="welcome-card"><div><p>Olá, {user?.name.split(' ')[0]} 👋</p><h2>Pronto para avançar nos seus objetivos?</h2><span>Use os atalhos abaixo para começar.</span></div><div className="welcome-art">↗</div></section>
    <div className="section-title"><div><h2>Acesso rápido</h2><p>Principais áreas da plataforma</p></div></div>
    <div className="shortcut-grid">{shortcuts.map((item) => <Link href={item.href} className="shortcut-card" key={item.href}><span className={`shortcut-icon ${item.color}`}>{item.icon}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b>→</b></Link>)}</div>
    <section className="tip-card"><span>✦</span><div><strong>Dica para começar</strong><p>Registre novas demandas como Ordens de Serviço e acompanhe o andamento centralizado na plataforma.</p></div><Link href="/service-orders">Ver minhas ordens →</Link></section></>;
}

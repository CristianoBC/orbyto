'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate, labels, LoadingState } from '@/components/ui/page-state';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import { hasReportsAccess } from '@/lib/permissions';
import type { DashboardItem, DashboardModuleKey, DashboardOverview } from '@/types/dashboard';

const moduleInfo: Record<DashboardModuleKey, { label: string; href: (id: string) => string }> = {
  serviceOrders: { label: 'Ordem de serviço', href: (id) => `/service-orders/${id}` },
  projects: { label: 'Projeto', href: (id) => `/projects/${id}` },
  tasks: { label: 'Tarefa', href: (id) => `/tasks/${id}` },
  dailyLogs: { label: 'Registro diário', href: () => '/daily-logs' },
};

function MetricCard({ label, value, hint, href, tone = 'violet' }: { label: string; value: number; hint: string; href: string; tone?: string }) {
  return <Link className={`indicator-card ${tone}`} href={href}><span>{label}</span><strong>{value}</strong><small>{hint}<b aria-hidden="true">→</b></small></Link>;
}

function EmptyList({ text }: { text: string }) { return <p className="dashboard-empty">{text}</p>; }

function DeadlineBadge({ deadline }: { deadline?: DashboardItem['deadline'] }) {
  const status = deadline === 'overdue' ? 'overdue' : deadline === 'dueSoon' ? 'dueSoon' : 'noDueDate';
  const label = deadline === 'overdue' ? 'Vencida' : deadline === 'dueSoon' ? 'Próxima do prazo' : 'Sem prazo';
  return <span className={`badge deadline-${status}`}>{label}</span>;
}

function ItemList({ items, empty, deadlines = false }: { items: DashboardItem[]; empty: string; deadlines?: boolean }) {
  if (!items.length) return <EmptyList text={empty} />;
  return <div className="dashboard-list">{items.map((item) => <Link href={moduleInfo[item.module].href(item.id)} key={`${item.module}-${item.id}`}>
    <div><strong>{item.title}</strong><small>{moduleInfo[item.module].label}{item.context ? ` · ${item.context}` : ''}{item.dueDate ? ` · Prazo ${formatDate(item.dueDate)}` : ''}</small></div>
    {deadlines ? <DeadlineBadge deadline={item.deadline} /> : <span className="dashboard-movement-date">{formatDate(item.updatedAt)}</span>}
  </Link>)}</div>;
}

function StatusSummary({ title, values }: { title: string; values: Record<string, number> }) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return <article className="status-summary-card"><header><h3>{title}</h3><strong>{total}</strong></header>{total ? <div className="status-summary-list">{Object.entries(values).sort((a, b) => b[1] - a[1]).map(([status, value]) => <div key={status}><span><i style={{ width: `${Math.max(4, value / total * 100)}%` }} /> </span><small>{labels[status] ?? status}</small><b>{value}</b></div>)}</div> : <EmptyList text="Nenhum item encontrado." />}</article>;
}

export default function DashboardPage() {
  const { user, permissions, can } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await apiRequest<DashboardOverview>('/dashboard/overview')); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o dashboard.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => data ? [
    data.metrics.serviceOrders && { label: 'OS abertas', value: data.metrics.serviceOrders.open, hint: 'Demandas em aberto', href: '/service-orders', tone: 'blue' },
    data.metrics.serviceOrders && { label: 'OS vencidas', value: data.metrics.serviceOrders.overdue, hint: 'Atenção imediata', href: '/service-orders', tone: 'coral' },
    data.metrics.serviceOrders && { label: 'OS próximas do prazo', value: data.metrics.serviceOrders.dueSoon, hint: 'Próximos 3 dias', href: '/service-orders', tone: 'amber' },
    data.metrics.projects && { label: 'Projetos ativos', value: data.metrics.projects.active, hint: 'Em andamento', href: '/projects', tone: 'violet' },
    data.metrics.projects && { label: 'Projetos atrasados', value: data.metrics.projects.overdue, hint: 'Prazo ultrapassado', href: '/projects', tone: 'coral' },
    data.metrics.tasks && { label: 'Tarefas pendentes', value: data.metrics.tasks.pending, hint: 'Planejadas ou a fazer', href: '/tasks', tone: 'amber' },
    data.metrics.tasks && { label: 'Tarefas em andamento', value: data.metrics.tasks.inProgress, hint: 'Em execução', href: '/tasks', tone: 'blue' },
    data.metrics.tasks && { label: 'Tarefas vencidas', value: data.metrics.tasks.overdue, hint: 'Atenção imediata', href: '/tasks', tone: 'coral' },
    data.metrics.dailyLogs && { label: 'Registros recentes', value: data.metrics.dailyLogs.recent, hint: 'Últimos 7 dias', href: '/daily-logs', tone: 'slate' },
  ].filter((item): item is NonNullable<typeof item> => Boolean(item)) : [], [data]);

  const shortcuts = [
    can('SERVICE_ORDERS', 'create') && { href: '/service-orders', icon: '+', title: 'Nova ordem de serviço', text: 'Registrar uma solicitação', color: 'blue' },
    can('PROJECTS', 'create') && { href: '/projects', icon: '◇', title: 'Novo projeto', text: 'Estruturar uma iniciativa', color: 'violet' },
    can('DAILY_LOGS', 'create') && { href: '/daily-logs', icon: '✎', title: 'Novo registro diário', text: 'Documentar o trabalho', color: 'amber' },
    can('TASKS') && can('KANBAN') && { href: '/tasks', icon: '✓', title: 'Ver Kanban', text: 'Acompanhar as tarefas', color: 'green' },
    hasReportsAccess(user?.role, permissions) && { href: '/reports', icon: '▤', title: 'Ver relatórios', text: 'Analisar resultados', color: 'violet' },
    can('SCHEDULE') && { href: '/schedule', icon: '▥', title: 'Ver cronograma', text: 'Visualizar os prazos', color: 'blue' },
  ].filter((item): item is Exclude<typeof item, false | undefined> => Boolean(item));

  return <>
    <div className="page-heading"><div><p className="eyebrow">Orbyto · Central operacional</p><h1>O que precisa da sua atenção hoje?</h1><p>Prioridades, prazos e movimentações relevantes em uma visão única.</p></div><span className="date-chip">Hoje · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date())}</span></div>
    {error && <div className="alert error dashboard-alert"><span>{error}</span><button onClick={() => void load()}>Tentar novamente</button></div>}
    {loading ? <LoadingState /> : data ? <>
      <section><div className="section-title"><h2>Indicadores principais</h2><p>Dados respeitando seu perfil e os módulos que você pode visualizar</p></div><div className="indicator-grid">{metrics.map((item) => <MetricCard {...item} key={item.label} />)}</div></section>
      <section className="dashboard-focus-grid">
        <article className="dashboard-panel attention-panel"><header><div><h3>Atenção hoje</h3><p>Itens críticos ordenados por urgência</p></div><span className="dashboard-count critical">{data.attention.length}</span></header><ItemList items={data.attention} empty="Tudo em dia por aqui. Nenhum item crítico encontrado." deadlines /></article>
        <article className="dashboard-panel"><header><div><h3>Próximos vencimentos</h3><p>OS e tarefas em 3 dias; projetos em 7 dias</p></div><span className="dashboard-count">{data.upcoming.length}</span></header><ItemList items={data.upcoming} empty="Nenhum vencimento próximo." deadlines /></article>
      </section>
      <section><div className="section-title"><h2>Últimas movimentações</h2><p>Atualizações mais recentes nos módulos acessíveis</p></div><article className="dashboard-panel movement-panel"><ItemList items={data.movements} empty="Nenhuma movimentação recente encontrada." /></article></section>
      {(data.statusSummary.serviceOrders || data.statusSummary.projects || data.statusSummary.tasks) && <section><div className="section-title"><h2>Resumo por status</h2><p>Distribuição dos itens que você pode acompanhar</p></div><div className="status-summary-grid">{data.statusSummary.serviceOrders && <StatusSummary title="Ordens de serviço" values={data.statusSummary.serviceOrders} />}{data.statusSummary.projects && <StatusSummary title="Projetos" values={data.statusSummary.projects} />}{data.statusSummary.tasks && <StatusSummary title="Tarefas" values={data.statusSummary.tasks} />}</div></section>}
      {shortcuts.length > 0 && <section><div className="section-title"><h2>Atalhos rápidos</h2><p>Ações disponíveis conforme suas permissões</p></div><div className="dashboard-shortcuts">{shortcuts.map((item) => <Link href={item.href} className="shortcut-card" key={item.title}><span className={`shortcut-icon ${item.color}`}>{item.icon}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b aria-hidden="true">→</b></Link>)}</div></section>}
    </> : null}
  </>;
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate, labels, LoadingState } from '@/components/ui/page-state';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import type { DailyLog } from '@/types/daily-log';
import type { Project } from '@/types/project';
import type { ServiceOrder } from '@/types/service-order';
import type { Task } from '@/types/task';

type DashboardData = {
  serviceOrders: ServiceOrder[];
  projects: Project[];
  tasks: Task[];
  dailyLogs: DailyLog[];
};

const emptyData: DashboardData = { serviceOrders: [], projects: [], tasks: [], dailyLogs: [] };
const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

const shortcuts = [
  { href: '/service-orders', icon: '+', title: 'Nova ordem de serviço', text: 'Registre uma nova solicitação', color: 'blue' },
  { href: '/projects', icon: '◇', title: 'Novo projeto', text: 'Estruture uma nova iniciativa', color: 'violet' },
  { href: '/daily-logs', icon: '✎', title: 'Novo registro diário', text: 'Documente a evolução do trabalho', color: 'amber' },
  { href: '/tasks', icon: '✓', title: 'Ver Kanban de tarefas', text: 'Acompanhe prioridades e andamento', color: 'green' },
];

function dateValue(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function EmptyList({ text }: { text: string }) {
  return <p className="dashboard-empty">{text}</p>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const requests = [
      apiRequest<ServiceOrder[]>('/service-orders/my'),
      apiRequest<Project[]>('/projects/my'),
      apiRequest<Task[]>('/tasks/my'),
      apiRequest<DailyLog[]>('/daily-logs/my'),
    ] as const;
    const results = await Promise.allSettled(requests);
    const failed = results.filter((result) => result.status === 'rejected');

    setData({
      serviceOrders: results[0].status === 'fulfilled' ? results[0].value : [],
      projects: results[1].status === 'fulfilled' ? results[1].value : [],
      tasks: results[2].status === 'fulfilled' ? results[2].value : [],
      dailyLogs: results[3].status === 'fulfilled' ? results[3].value : [],
    });
    if (failed.length) {
      const firstError = failed[0].reason;
      setError(failed.length === results.length
        ? (firstError instanceof Error ? firstError.message : 'Não foi possível carregar o dashboard.')
        : 'Alguns indicadores não puderam ser carregados. Os demais dados continuam disponíveis.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const view = useMemo(() => {
    const recentLimit = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentOrders = [...data.serviceOrders].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)).slice(0, 4);
    const recentProjects = [...data.projects].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)).slice(0, 4);
    const priorityTasks = data.tasks
      .filter((task) => !['DONE', 'CANCELED'].includes(task.status))
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || dateValue(a.dueDate) - dateValue(b.dueDate))
      .slice(0, 5);
    const recentLogs = [...data.dailyLogs].sort((a, b) => dateValue(b.logDate) - dateValue(a.logDate) || dateValue(b.createdAt) - dateValue(a.createdAt)).slice(0, 4);
    return {
      indicators: [
        { label: 'Ordens abertas', value: data.serviceOrders.filter((item) => !['COMPLETED', 'CANCELED'].includes(item.status)).length, href: '/service-orders', tone: 'coral' },
        { label: 'Projetos ativos', value: data.projects.filter((item) => item.status === 'IN_PROGRESS').length, href: '/projects', tone: 'violet' },
        { label: 'Tarefas pendentes', value: data.tasks.filter((item) => ['PLANNED', 'TODO'].includes(item.status)).length, href: '/tasks', tone: 'amber' },
        { label: 'Em execução', value: data.tasks.filter((item) => item.status === 'DOING').length, href: '/tasks', tone: 'blue' },
        { label: 'Tarefas concluídas', value: data.tasks.filter((item) => item.status === 'DONE').length, href: '/tasks', tone: 'green' },
        { label: 'Registros recentes', value: data.dailyLogs.filter((item) => dateValue(item.logDate) >= recentLimit).length, href: '/daily-logs', tone: 'slate', hint: 'Últimos 7 dias' },
      ],
      recentOrders, recentProjects, priorityTasks, recentLogs,
    };
  }, [data]);

  return <>
    <div className="page-heading"><div><p className="eyebrow">Orbyto · Visão operacional</p><h1>Dashboard</h1><p>Indicadores e atividades que precisam da sua atenção.</p></div><span className="date-chip">Hoje · {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date())}</span></div>

    <section className="dashboard-welcome"><div><p>Olá, {user?.name.split(' ')[0]}</p><h2>Seu trabalho, em uma visão objetiva.</h2><span>Acompanhe demandas, projetos e entregas sem perder o contexto operacional.</span></div><div className="dashboard-welcome-mark" aria-hidden="true">↗</div></section>

    {error && <div className="alert error dashboard-alert"><span>{error}</span><button onClick={() => void load()}>Tentar novamente</button></div>}
    {loading ? <LoadingState /> : <>
      <section aria-labelledby="indicator-title"><div className="section-title"><h2 id="indicator-title">Indicadores operacionais</h2><p>Resumo calculado a partir dos itens vinculados a você</p></div><div className="indicator-grid">{view.indicators.map((item) => <Link className={`indicator-card ${item.tone}`} href={item.href} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.hint ?? 'Ver detalhes'} <b aria-hidden="true">→</b></small></Link>)}</div></section>

      <section aria-labelledby="tracking-title"><div className="section-title"><h2 id="tracking-title">Acompanhamento</h2><p>Atividades recentes e prioridades do seu dia a dia</p></div><div className="dashboard-sections">
        <article className="dashboard-panel"><header><div><h3>Últimas ordens de serviço</h3><p>Solicitações criadas recentemente</p></div><Link href="/service-orders">Ver todas</Link></header><div className="dashboard-list">{view.recentOrders.length ? view.recentOrders.map((item) => <Link href={`/service-orders/${item.id}`} key={item.id}><div><strong>{item.title}</strong><small>{formatDate(item.createdAt)} · {labels[item.priority ?? 'MEDIUM']}</small></div><span className="badge status">{labels[item.status]}</span></Link>) : <EmptyList text="Nenhuma ordem de serviço encontrada." />}</div></article>

        <article className="dashboard-panel"><header><div><h3>Projetos recentes</h3><p>Iniciativas acessíveis para você</p></div><Link href="/projects">Ver todos</Link></header><div className="dashboard-list">{view.recentProjects.length ? view.recentProjects.map((item) => <Link href={`/projects/${item.id}`} key={item.id}><div><strong>{item.name}</strong><small>{item.owner?.name ?? 'Sem responsável'} · {formatDate(item.createdAt)}</small></div><span className="badge status">{labels[item.status]}</span></Link>) : <EmptyList text="Nenhum projeto encontrado." />}</div></article>

        <article className="dashboard-panel"><header><div><h3>Tarefas prioritárias</h3><p>Pendências ordenadas por prioridade</p></div><Link href="/tasks">Abrir Kanban</Link></header><div className="dashboard-list">{view.priorityTasks.length ? view.priorityTasks.map((item) => <Link href="/tasks" key={item.id}><div><strong>{item.title}</strong><small>{item.project?.title ?? 'Sem projeto'} · Prazo: {formatDate(item.dueDate)}</small></div><div className="dashboard-item-badges"><span className={`badge priority-${item.priority.toLowerCase()}`}>{labels[item.priority]}</span><span className="badge status">{labels[item.status]}</span></div></Link>) : <EmptyList text="Nenhuma tarefa pendente encontrada." />}</div></article>

        <article className="dashboard-panel"><header><div><h3>Registros diários recentes</h3><p>Últimas atualizações de trabalho</p></div><Link href="/daily-logs">Ver todos</Link></header><div className="dashboard-list">{view.recentLogs.length ? view.recentLogs.map((item) => <Link href="/daily-logs" key={item.id}><div><strong>{item.title}</strong><small>{item.project?.title ?? 'Sem projeto'} · {formatDate(item.logDate)}</small></div>{item.workedHours != null && <span className="dashboard-hours">{item.workedHours}h</span>}</Link>) : <EmptyList text="Nenhum registro diário encontrado." />}</div></article>
      </div></section>

      <section aria-labelledby="shortcut-title"><div className="section-title"><h2 id="shortcut-title">Atalhos rápidos</h2><p>Acesse os principais fluxos operacionais</p></div><div className="dashboard-shortcuts">{shortcuts.map((item) => <Link href={item.href} className="shortcut-card" key={item.title}><span className={`shortcut-icon ${item.color}`}>{item.icon}</span><div><h3>{item.title}</h3><p>{item.text}</p></div><b aria-hidden="true">→</b></Link>)}</div></section>
    </>}
  </>;
}

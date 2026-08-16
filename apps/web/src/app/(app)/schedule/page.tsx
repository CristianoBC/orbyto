'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorState, labels, LoadingState } from '@/components/ui/page-state';
import { apiRequest } from '@/lib/api';
import type { Project } from '@/types/project';
import { useAuth } from '@/contexts/auth-context';

const dayMs = 86_400_000;
const monthTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const parseDate = (value: string) => { const date = new Date(value); return new Date(date.getFullYear(), date.getMonth(), date.getDate()); };

export default function SchedulePage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setProjects(await apiRequest<Project[]>(user?.role === 'VIEWER' ? '/projects' : '/projects/my')); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao carregar o cronograma.'); } finally { setLoading(false); } }, [user?.role]);
  useEffect(() => { void load(); }, [load]);

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthEnd = new Date(month.getFullYear(), month.getMonth(), days);
  const { visible, undated } = useMemo(() => {
    const complete = projects.filter((project) => project.startDate && project.dueDate);
    return {
      visible: complete.filter((project) => parseDate(project.startDate!) <= monthEnd && parseDate(project.dueDate!) >= month).sort((a, b) => parseDate(a.startDate!).getTime() - parseDate(b.startDate!).getTime()),
      undated: projects.filter((project) => !project.startDate || !project.dueDate),
    };
  }, [projects, month, monthEnd]);
  const today = new Date();
  const todayDay = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth() ? today.getDate() : 0;

  function move(offset: number) { setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)); }
  function currentMonth() { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); }

  return <>
    <div className="page-heading schedule-heading"><div><p className="eyebrow">Orbyto · Planejamento</p><h1>Cronograma</h1><p>Visualize os períodos planejados e acompanhe os prazos dos projetos.</p></div></div>
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <LoadingState /> : !projects.length ? <div className="state-card empty"><span>▥</span><strong>Nenhum projeto no cronograma</strong><p>Crie projetos e informe as datas planejadas para começar.</p></div> : <>
      <section className="schedule-card">
        <header className="schedule-toolbar"><div><button className="schedule-nav" onClick={() => move(-1)} aria-label="Mês anterior">←</button><button className="button ghost small" onClick={currentMonth}>Mês atual</button><button className="schedule-nav" onClick={() => move(1)} aria-label="Próximo mês">→</button></div><h2>{monthTitle.format(month)}</h2><span>{visible.length} {visible.length === 1 ? 'projeto no mês' : 'projetos no mês'}</span></header>
        <div className="schedule-scroll">
          <div className="schedule-grid" style={{ '--schedule-days': days } as React.CSSProperties}>
            <div className="schedule-corner">Projeto</div>
            <div className="schedule-days">{Array.from({ length: days }, (_, index) => <div className={todayDay === index + 1 ? 'today' : ''} key={index}><span>{index + 1}</span><small>{new Intl.DateTimeFormat('pt-BR', { weekday: 'narrow' }).format(new Date(month.getFullYear(), month.getMonth(), index + 1))}</small></div>)}</div>
            {!visible.length ? <div className="schedule-month-empty">Nenhum projeto com período planejado cruza este mês.</div> : visible.map((project) => {
              const start = parseDate(project.startDate!); const end = parseDate(project.dueDate!);
              const clippedStart = start < month ? month : start; const clippedEnd = end > monthEnd ? monthEnd : end;
              const startDay = Math.round((clippedStart.getTime() - month.getTime()) / dayMs) + 1;
              const span = Math.round((clippedEnd.getTime() - clippedStart.getTime()) / dayMs) + 1;
              return <div className="schedule-row" key={project.id}>
                <Link className="schedule-project" href={`/projects/${project.id}`}><strong>{project.name}</strong><span>{shortDate.format(start)} — {shortDate.format(end)}</span></Link>
                <div className="schedule-track">{Array.from({ length: days }, (_, index) => <i className={todayDay === index + 1 ? 'today' : ''} key={index} />)}<Link href={`/projects/${project.id}`} className={`schedule-bar status-${project.status.toLowerCase()} priority-${project.priority.toLowerCase()}`} style={{ gridColumn: `${startDay} / span ${span}` }} title={`${project.name}: ${shortDate.format(start)} a ${shortDate.format(end)}`}><span>{project.name}</span><b>{labels[project.status]}</b></Link></div>
              </div>;
            })}
          </div>
        </div>
      </section>
      {undated.length > 0 && <section className="undated-projects"><div className="section-head"><div><h2>Projetos sem prazo definido</h2><p>Projetos que ainda precisam de uma data de início ou de um prazo previsto.</p></div><span>{undated.length}</span></div><div>{undated.map((project) => <Link href={`/projects/${project.id}`} key={project.id}><div><strong>{project.name}</strong><small>{!project.startDate && !project.dueDate ? 'Sem data de início e prazo' : !project.startDate ? 'Sem data de início' : 'Sem prazo previsto'}</small></div><div className="badges"><span className={`badge priority-${project.priority.toLowerCase()}`}>{labels[project.priority]}</span><span className="badge status">{labels[project.status]}</span></div></Link>)}</div></section>}
    </>}
  </>;
}

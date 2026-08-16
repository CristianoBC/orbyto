'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DailyLogList } from '@/components/daily-logs/daily-log-list';
import { DailyLogModal } from '@/components/daily-logs/daily-log-modal';
import { PageHeader } from '@/components/ui/forms';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/page-state';
import { apiRequest } from '@/lib/api';
import type { DailyLog } from '@/types/daily-log';
import type { Project } from '@/types/project';
import { useAuth } from '@/contexts/auth-context';

export default function DailyLogsPage() {
  const { can, user } = useAuth();
  const canCreate = can('DAILY_LOGS', 'create'); const canEdit = can('DAILY_LOGS', 'edit');
  const [items, setItems] = useState<DailyLog[]>([]); const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<DailyLog | null>(null);
  const [search, setSearch] = useState(''); const [projectId, setProjectId] = useState(''); const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await apiRequest<DailyLog[]>(user?.role === 'VIEWER' ? '/daily-logs' : '/daily-logs/my')); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao carregar os registros.'); } finally { setLoading(false); } }, [user?.role]);
  useEffect(() => { void load(); if (can('PROJECTS')) apiRequest<Project[]>(user?.role === 'VIEWER' ? '/projects' : '/projects/my').then(setProjects).catch(() => setProjects([])); }, [load, can, user?.role]);
  const filtered = useMemo(() => items.filter((item) => {
    const text = `${item.title} ${item.content ?? ''} ${item.project?.title ?? ''}`.toLocaleLowerCase('pt-BR');
    const date = item.logDate.slice(0, 10);
    return (!search || text.includes(search.toLocaleLowerCase('pt-BR'))) && (!projectId || item.project?.id === projectId) && (!startDate || date >= startDate) && (!endDate || date <= endDate);
  }), [items, search, projectId, startDate, endDate]);
  function showCreate() { setEditing(null); setNotice(''); setOpen(true); }
  function showEdit(item: DailyLog) { setEditing(item); setNotice(''); setOpen(true); }
  async function saved(message: string) { setOpen(false); setEditing(null); setNotice(message); await load(); }
  const hasFilters = !!(search || projectId || startDate || endDate);
  return <>
    <PageHeader title="Registros Diários" text="Registre e acompanhe a evolução do seu trabalho em projetos." action={canCreate ? showCreate : undefined} label={canCreate ? 'Novo registro' : undefined} />
    {notice && <div className="alert success">{notice}</div>}
    <div className="daily-log-toolbar">
      <label className="daily-log-search"><span>Buscar</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, conteúdo ou projeto" /></label>
      <label><span>Projeto</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Todos os projetos</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
      <label><span>De</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label><span>Até</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      {hasFilters && <button className="kanban-clear" onClick={() => { setSearch(''); setProjectId(''); setStartDate(''); setEndDate(''); }}>Limpar filtros</button>}
    </div>
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <LoadingState /> : !filtered.length ? <EmptyState text={hasFilters ? 'Nenhum registro corresponde aos filtros.' : 'Nenhum registro diário encontrado.'} /> : <><p className="daily-log-count"><strong>{filtered.length}</strong> {filtered.length === 1 ? 'registro encontrado' : 'registros encontrados'}</p><DailyLogList items={filtered} onEdit={canEdit ? showEdit : undefined} /></>}
    {open && <DailyLogModal projects={projects} editing={editing} onClose={() => setOpen(false)} onSaved={saved} />}
  </>;
}

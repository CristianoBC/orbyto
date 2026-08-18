'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import type { PermissionModule } from '@/types/auth';
import type { DailyLogReportRow, ProjectReportRow, ServiceOrderReportRow, TaskReportRow } from '@/types/report';

type ReportKey = 'service-orders' | 'projects' | 'tasks' | 'daily-logs';
type Row = ServiceOrderReportRow | ProjectReportRow | TaskReportRow | DailyLogReportRow;
type Filters = { dateFrom: string; dateTo: string; status: string; priority: string; projectId: string; requesterId: string; responsibleId: string; assigneeId: string; unit: string; category: string };
type Column = { label: string; value(row: Row): string | number | null | undefined };
const emptyFilters: Filters = { dateFrom: '', dateTo: '', status: '', priority: '', projectId: '', requesterId: '', responsibleId: '', assigneeId: '', unit: '', category: '' };
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—';
const labels: Record<string, string> = { OPEN: 'Aberta', IN_REVIEW: 'Em análise', IN_PROGRESS: 'Em andamento', WAITING_REQUESTER: 'Aguardando solicitante', COMPLETED: 'Concluído', CANCELED: 'Cancelado', PLANNED: 'Planejado', PAUSED: 'Pausado', TODO: 'A fazer', DOING: 'Em execução', DONE: 'Concluída', PENDING: 'Pendente', WAITING_RETURN: 'Aguardando retorno', LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' };
const reportConfig: Record<ReportKey, { label: string; module: PermissionModule; file: string }> = {
  'service-orders': { label: 'Ordens de Serviço', module: 'SERVICE_ORDERS', file: 'relatorio-ordens-servico.csv' },
  projects: { label: 'Projetos', module: 'PROJECTS', file: 'relatorio-projetos.csv' },
  tasks: { label: 'Tarefas', module: 'TASKS', file: 'relatorio-tarefas.csv' },
  'daily-logs': { label: 'Registros Diários', module: 'DAILY_LOGS', file: 'relatorio-registros-diarios.csv' },
};

function columnsFor(report: ReportKey): Column[] {
  if (report === 'service-orders') return [
    { label: 'Número', value: (r) => r.id.slice(0, 8).toUpperCase() }, { label: 'Título', value: (r) => (r as ServiceOrderReportRow).title },
    { label: 'Solicitante', value: (r) => (r as ServiceOrderReportRow).requester.name }, { label: 'Responsável', value: (r) => (r as ServiceOrderReportRow).responsible?.name ?? '—' },
    { label: 'Status', value: (r) => labels[(r as ServiceOrderReportRow).status] }, { label: 'Prioridade', value: (r) => labels[(r as ServiceOrderReportRow).priority ?? ''] ?? '—' },
    { label: 'Categoria', value: (r) => (r as ServiceOrderReportRow).category ?? '—' }, { label: 'Sistema', value: (r) => (r as ServiceOrderReportRow).system ?? '—' },
    { label: 'Unidade', value: (r) => (r as ServiceOrderReportRow).unit ?? '—' }, { label: 'Prazo', value: (r) => date((r as ServiceOrderReportRow).dueDate) },
    { label: 'Criação', value: (r) => date((r as ServiceOrderReportRow).createdAt) }, { label: 'Atualização', value: (r) => date((r as ServiceOrderReportRow).updatedAt) },
    { label: 'Conclusão', value: (r) => date((r as ServiceOrderReportRow).finishedAt) },
  ];
  if (report === 'projects') return [
    { label: 'Nome', value: (r) => (r as ProjectReportRow).title }, { label: 'Responsável', value: (r) => (r as ProjectReportRow).owner.name },
    { label: 'Status', value: (r) => labels[(r as ProjectReportRow).status] }, { label: 'Prioridade', value: (r) => labels[(r as ProjectReportRow).priority] },
    { label: 'Departamento', value: (r) => (r as ProjectReportRow).area ?? '—' }, { label: 'Unidade', value: (r) => (r as ProjectReportRow).unit ?? '—' },
    { label: 'Início previsto', value: (r) => date((r as ProjectReportRow).startDate) }, { label: 'Prazo previsto', value: (r) => date((r as ProjectReportRow).dueDate) },
    { label: 'Conclusão real', value: (r) => date((r as ProjectReportRow).finishedAt) }, { label: 'Criação', value: (r) => date((r as ProjectReportRow).createdAt) },
  ];
  if (report === 'tasks') return [
    { label: 'Título', value: (r) => (r as TaskReportRow).title }, { label: 'Projeto', value: (r) => (r as TaskReportRow).project.title },
    { label: 'Responsável', value: (r) => (r as TaskReportRow).assignee?.name ?? '—' }, { label: 'Status', value: (r) => labels[(r as TaskReportRow).status] },
    { label: 'Prioridade', value: (r) => labels[(r as TaskReportRow).priority] }, { label: 'Prazo', value: (r) => date((r as TaskReportRow).dueDate) },
    { label: 'Criação', value: (r) => date((r as TaskReportRow).createdAt) }, { label: 'Atualização', value: (r) => date((r as TaskReportRow).updatedAt) },
  ];
  return [
    { label: 'Data', value: (r) => date((r as DailyLogReportRow).date) }, { label: 'Título', value: (r) => (r as DailyLogReportRow).title },
    { label: 'Projeto', value: (r) => (r as DailyLogReportRow).project?.title ?? '—' }, { label: 'Tarefa', value: () => '—' },
    { label: 'Autor', value: (r) => (r as DailyLogReportRow).user.name }, { label: 'Horas trabalhadas', value: (r) => (r as DailyLogReportRow).workedHours ?? '—' },
    { label: 'Status', value: (r) => labels[(r as DailyLogReportRow).status] }, { label: 'Resumo / conteúdo', value: (r) => (r as DailyLogReportRow).description ?? '—' },
  ];
}

export default function ReportsPage() {
  const { can } = useAuth();
  const available = (Object.keys(reportConfig) as ReportKey[]).filter((key) => can(reportConfig[key].module));
  const [report, setReport] = useState<ReportKey>(available[0] ?? 'service-orders');
  const [filters, setFilters] = useState(emptyFilters); const [applied, setApplied] = useState(emptyFilters);
  const [rows, setRows] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const columns = useMemo(() => columnsFor(report), [report]);
  const load = useCallback(async () => {
    if (!can(reportConfig[report].module)) return;
    setLoading(true); setError('');
    const query = new URLSearchParams();
    Object.entries(applied).forEach(([key, value]) => {
      const relevant = ['dateFrom', 'dateTo', 'status'].includes(key) || (report !== 'daily-logs' && key === 'priority') || (report === 'service-orders' && ['unit', 'category', 'requesterId', 'responsibleId'].includes(key)) || (report === 'projects' && key === 'responsibleId') || (report === 'tasks' && ['projectId', 'assigneeId'].includes(key)) || (report === 'daily-logs' && ['projectId', 'responsibleId'].includes(key));
      if (value && relevant) query.set(key, key === 'dateTo' ? `${value}T23:59:59.999Z` : value);
    });
    try { setRows(await apiRequest<Row[]>(`/reports/${report}?${query}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o relatório.'); setRows([]); }
    finally { setLoading(false); }
  }, [applied, can, report]);
  useEffect(() => { void load(); }, [load]);
  function changeReport(next: ReportKey) { setReport(next); setFilters(emptyFilters); setApplied(emptyFilters); setRows([]); }
  function submit(event: FormEvent) { event.preventDefault(); setApplied(filters); }
  function exportCsv() {
    const safe = (value: unknown) => { let text = String(value ?? ''); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
    const csv = [columns.map((column) => safe(column.label)).join(';'), ...rows.map((row) => columns.map((column) => safe(column.value(row))).join(';'))].join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = reportConfig[report].file; anchor.click(); URL.revokeObjectURL(url);
  }
  const statusOptions = report === 'service-orders' ? ['OPEN', 'IN_REVIEW', 'IN_PROGRESS', 'WAITING_REQUESTER', 'COMPLETED', 'CANCELED'] : report === 'projects' ? ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELED'] : report === 'tasks' ? ['PLANNED', 'TODO', 'DOING', 'DONE', 'CANCELED'] : ['COMPLETED', 'IN_PROGRESS', 'PENDING', 'WAITING_RETURN'];
  return <>
    <header className="page-heading"><div><p className="eyebrow">Análise gerencial</p><h1>Relatórios</h1><p>Consulte dados operacionais e exporte os resultados filtrados.</p></div><button className="button primary" disabled={loading || !rows.length} onClick={exportCsv}>Exportar CSV</button></header>
    <div className="report-tabs" role="tablist">{available.map((key) => <button role="tab" aria-selected={report === key} className={report === key ? 'active' : ''} key={key} onClick={() => changeReport(key)}>{reportConfig[key].label}</button>)}</div>
    <form className="report-filters" onSubmit={submit}>
      <label>Período inicial<input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} /></label>
      <label>Período final<input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} /></label>
      <label>Status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Todos</option>{statusOptions.map((item) => <option value={item} key={item}>{labels[item]}</option>)}</select></label>
      {report !== 'daily-logs' && <label>Prioridade<select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option value="">Todas</option>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((item) => <option value={item} key={item}>{labels[item]}</option>)}</select></label>}
      {report === 'service-orders' && <><label>Unidade<input value={filters.unit} onChange={(e) => setFilters({ ...filters, unit: e.target.value })} placeholder="Unidade exata" /></label><label>Categoria<input value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} placeholder="Categoria exata" /></label></>}
      {report === 'service-orders' && <label>Solicitante<input value={filters.requesterId} onChange={(e) => setFilters({ ...filters, requesterId: e.target.value })} placeholder="ID do solicitante" /></label>}
      {(report === 'service-orders' || report === 'projects' || report === 'daily-logs') && <label>{report === 'daily-logs' ? 'Autor' : 'Responsável'}<input value={filters.responsibleId} onChange={(e) => setFilters({ ...filters, responsibleId: e.target.value })} placeholder={`ID do ${report === 'daily-logs' ? 'autor' : 'responsável'}`} /></label>}
      {report === 'tasks' && <label>Responsável<input value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })} placeholder="ID do responsável" /></label>}
      {(report === 'tasks' || report === 'daily-logs') && <label>Projeto<input value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })} placeholder="ID do projeto" /></label>}
      <div className="report-filter-actions"><button className="button primary" disabled={loading}>Aplicar filtros</button><button type="button" className="button ghost" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); }}>Limpar</button></div>
    </form>
    {error ? <div className="alert error"><span>{error}</span><button onClick={() => void load()}>Tentar novamente</button></div> : loading ? <div className="report-state"><span className="spinner" />Carregando relatório...</div> : !rows.length ? <div className="report-state"><strong>Nenhum resultado encontrado</strong><span>Ajuste os filtros e tente novamente.</span></div> : <section className="report-card"><header><strong>{rows.length} registro(s)</strong><span>Os dados exibidos respeitam seu perfil e suas permissões.</span></header><div className="report-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.label}>{column.value(row)}</td>)}</tr>)}</tbody></table></div></section>}
  </>;
}

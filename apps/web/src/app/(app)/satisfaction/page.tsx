'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { apiRequest } from '@/lib/api';
import type { Satisfaction, SatisfactionFollowUpStatus, SatisfactionSummary } from '@/types/satisfaction';

const ITEMS_PER_PAGE = 10;
const statusLabels: Record<SatisfactionFollowUpStatus, string> = { PENDING: 'Pendente de análise', IN_REVIEW: 'Em análise', RESOLVED: 'Tratativa realizada', CLOSED: 'Encerrada' };
const statuses = Object.keys(statusLabels) as SatisfactionFollowUpStatus[];
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

type Filters = { from: string; to: string; rating: string; lowOnly: boolean; followUpStatus: string; requester: string };
const initialFilters: Filters = { from: '', to: '', rating: '', lowOnly: false, followUpStatus: '', requester: '' };

export default function SatisfactionPage() {
  const [items, setItems] = useState<Satisfaction[]>([]);
  const [summary, setSummary] = useState<SatisfactionSummary | null>(null);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Satisfaction | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState<SatisfactionFollowUpStatus>('IN_REVIEW');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const pageCount = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [items, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, String(value)); });
    try {
      const query = params.toString();
      const [list, totals] = await Promise.all([
        apiRequest<Satisfaction[]>(`/satisfaction${query ? `?${query}` : ''}`),
        apiRequest<SatisfactionSummary>(`/satisfaction/summary${query ? `?${query}` : ''}`),
      ]);
      setItems(list);
      setSummary(totals);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as avaliações.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage((current) => Math.min(current, pageCount)); }, [pageCount]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function open(item: Satisfaction) {
    setSelected(item);
    setFollowUpStatus(item.followUpStatus ?? 'PENDING');
    setFollowUpNotes(item.followUpNotes ?? '');
    setError('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await apiRequest(`/satisfaction/${selected.id}/follow-up`, { method: 'PATCH', body: { followUpStatus, followUpNotes } });
      setSelected(null);
      setNotice('Tratativa atualizada com sucesso.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a tratativa.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="page-stack satisfaction-page">
    <header className="page-header"><div><p className="eyebrow">Experiência do cliente interno</p><h1>Satisfação</h1><p>Acompanhe avaliações e trate retornos que exigem atenção.</p></div></header>
    {notice && <div className="alert success">{notice}</div>}{error && <div className="alert error">{error}</div>}
    <div className="metrics-grid satisfaction-metrics"><Metric label="Média geral" value={summary ? `${summary.averageRating.toFixed(1)} / 5` : '—'} /><Metric label="Total de avaliações" value={summary?.total ?? '—'} /><Metric label="Avaliações baixas" value={summary?.lowRatings ?? '—'} /><Metric label="Satisfação alta" value={summary ? `${summary.highSatisfactionPercentage}%` : '—'} /><Metric label="Pendentes de tratativa" value={summary?.pendingFollowUps ?? '—'} /></div>
    <section className="panel"><form className="filters-grid" onSubmit={(event) => { event.preventDefault(); void load(); }}><label>De<input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} /></label><label>Até<input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} /></label><label>Nota<select value={filters.rating} onChange={(event) => updateFilter('rating', event.target.value)}><option value="">Todas</option>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select value={filters.followUpStatus} onChange={(event) => updateFilter('followUpStatus', event.target.value)}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><label>Solicitante<input value={filters.requester} onChange={(event) => updateFilter('requester', event.target.value)} placeholder="Nome ou e-mail" /></label><label className="check-filter"><input type="checkbox" checked={filters.lowOnly} onChange={(event) => updateFilter('lowOnly', event.target.checked)} /> Somente notas baixas</label></form></section>
    <section className="panel satisfaction-list">
      {loading ? <p className="inline-empty">Carregando avaliações...</p> : items.length ? <>
        <div className="table-wrap"><table><thead><tr><th>OS</th><th>Solicitante</th><th>Nota</th><th>Retorno</th><th>Data</th><th>Tratativa</th><th></th></tr></thead><tbody>{paginatedItems.map((item) => <tr key={item.id}><td><Link href={`/service-orders/${item.serviceOrder.id}`}>{item.serviceOrder.title}</Link></td><td>{item.requester.name}<small>{item.requester.email}</small></td><td><span className={`rating-pill rating-${item.rating}`}>★ {item.rating}</span></td><td>{item.lowRatingReason || item.comment || 'Sem comentário'}</td><td>{date(item.createdAt)}</td><td>{item.followUpStatus ? statusLabels[item.followUpStatus] : 'Não se aplica'}</td><td>{item.rating <= 3 && <button type="button" className="button ghost small" onClick={() => open(item)}>Registrar tratativa</button>}</td></tr>)}</tbody></table></div>
        <nav className="satisfaction-pagination" aria-label="Paginação das avaliações"><span>{items.length} {items.length === 1 ? 'avaliação' : 'avaliações'} · Página {page} de {pageCount}</span><div><button type="button" className="button ghost small" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</button><button type="button" className="button ghost small" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Próxima</button></div></nav>
      </> : <p className="inline-empty">Nenhuma avaliação encontrada.</p>}
    </section>
    {selected && <Modal title="Tratativa da avaliação" eyebrow={`Nota ${selected.rating} · ${selected.serviceOrder.title}`} onClose={() => !saving && setSelected(null)}><form className="form-grid" onSubmit={save}>{error && <div className="alert error span-2">{error}</div>}<label>Status<select value={followUpStatus} onChange={(event) => setFollowUpStatus(event.target.value as SatisfactionFollowUpStatus)}>{statuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><label className="span-2">Observação ou ação realizada<textarea rows={5} required maxLength={5000} value={followUpNotes} onChange={(event) => setFollowUpNotes(event.target.value)} /></label><div className="form-actions span-2"><button type="button" className="button ghost" onClick={() => setSelected(null)}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar tratativa'}</button></div></form></Modal>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="metric-card"><span>{label}:</span><strong>{value}</strong></article>;
}

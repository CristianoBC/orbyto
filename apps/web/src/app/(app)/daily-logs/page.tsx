'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { DailyLog } from '@/types/task';
import { EmptyState, ErrorState, formatDate, LoadingState } from '@/components/ui/page-state';
import { PageHeader } from '@/components/ui/forms';

export default function DailyLogsPage() {
  const [items, setItems] = useState<DailyLog[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setItems(await apiRequest('/daily-logs/my')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <><PageHeader title="Registros Diários" text="Consulte o histórico das atividades registradas." />{error && <ErrorState message={error} retry={load} />}{loading ? <LoadingState /> : !items.length ? <EmptyState text="Seus registros diários aparecerão aqui." /> : <div className="data-list">{items.map((item) => <article className="data-card" key={item.id}><div className="data-main"><span className="item-icon amber">◷</span><div><h3>{item.title}</h3><p>{item.content || 'Sem detalhes adicionais.'}</p><small>{item.project ? `Projeto: ${item.project.title} · ` : ''}{formatDate(item.logDate)}</small></div></div></article>)}</div>}</>;
}

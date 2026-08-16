'use client';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import type { User } from '@/types/auth';
import { EmptyState, ErrorState, labels, LoadingState } from '@/components/ui/page-state';
import { PageHeader } from '@/components/ui/forms';

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setItems(await apiRequest('/users')); setError(''); } catch (e) { setError(e instanceof ApiError && e.status === 403 ? 'Seu perfil não possui permissão para consultar os usuários deste ambiente.' : e instanceof Error ? e.message : 'Erro ao carregar.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <><PageHeader title="Usuários" text="Consulte as pessoas que fazem parte deste ambiente." />{error && <ErrorState message={error} retry={load} />}{loading ? <LoadingState /> : !error && !items.length ? <EmptyState text="Nenhum usuário foi encontrado." /> : <div className="user-grid">{items.map((item) => <article className="user-card" key={item.id}><span className="avatar large">{item.name.split(' ').slice(0,2).map((p) => p[0]).join('')}</span><div><h3>{item.name}</h3><p>{item.email}</p><div className="badges"><span className="badge status">{labels[item.role]}</span><span className={`badge user-${item.status.toLowerCase()}`}>{labels[item.status]}</span></div></div></article>)}</div>}</>;
}

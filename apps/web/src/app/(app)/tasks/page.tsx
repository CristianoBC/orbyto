'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { Task } from '@/types/task';
import { EmptyState, ErrorState, formatDate, labels, LoadingState } from '@/components/ui/page-state';
import { PageHeader } from '@/components/ui/forms';

export default function TasksPage() {
  const [items, setItems] = useState<Task[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setItems(await apiRequest('/tasks/my')); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <><PageHeader title="Tarefas" text="Acompanhe suas atividades, prioridades e prazos." action={() => setNotice(true)} label="Nova tarefa" />{notice && <div className="alert info">A criação de tarefas estará disponível em breve. As tarefas são vinculadas a projetos.<button onClick={() => setNotice(false)}>×</button></div>}{error && <ErrorState message={error} retry={load} />}{loading ? <LoadingState /> : !items.length ? <EmptyState text="Você ainda não possui tarefas atribuídas." /> : <div className="data-list">{items.map((item) => <article className="data-card" key={item.id}><div className="data-main"><span className="item-icon green">✓</span><div><h3>{item.title}</h3><p>Projeto: <strong>{item.project?.title ?? 'Não informado'}</strong></p><small>Prazo: {formatDate(item.dueDate)}</small></div></div><div className="badges"><span className={`badge priority-${item.priority.toLowerCase()}`}>{labels[item.priority]}</span><span className="badge status">{labels[item.status]}</span></div></article>)}</div>}</>;
}

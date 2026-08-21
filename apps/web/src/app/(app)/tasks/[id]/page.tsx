'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { TargetPanels } from '@/components/collaboration/target-panels';
import { Field, FormActions, SelectPriority } from '@/components/ui/forms';
import { Modal } from '@/components/ui/modal';
import { ErrorState, formatDate, labels } from '@/components/ui/page-state';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import { taskDeadline } from '@/lib/deadline';
import type { User } from '@/types/auth';
import type { Priority } from '@/types/service-order';
import type { Task, TaskStatus, UpdateTask } from '@/types/task';

const statuses: TaskStatus[] = ['PLANNED', 'TODO', 'DOING', 'DONE', 'CANCELED'];
type FormState = { title: string; description: string; priority: Priority; status: TaskStatus; assigneeId: string; dueDate: string };

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can, user } = useAuth();
  const canEdit = can('TASKS', 'edit') || can('TASKS', 'manage');
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTask(await apiRequest<Task>(`/tasks/${id}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a tarefa.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!editorOpen || !can('USERS')) return;
    void apiRequest<User[]>('/users').then(setUsers).catch(() => setUsers([]));
  }, [can, editorOpen]);

  const deadline = useMemo(() => task ? taskDeadline(task) : null, [task]);
  const assigneeOptions = useMemo(() => {
    const options = [...users];
    if (task?.assignee && !options.some((item) => item.id === task.assignee?.id)) options.push(task.assignee as User);
    if (user && !options.some((item) => item.id === user.id)) options.push(user as User);
    return options;
  }, [task, user, users]);

  async function quickStatus(status: TaskStatus) {
    if (!task || status === task.status) return;
    setUpdating(true); setError(''); setNotice('');
    try { setTask(await apiRequest<Task>(`/tasks/${id}`, { method: 'PATCH', body: { status } })); setNotice('Status atualizado com sucesso.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível alterar o status.'); }
    finally { setUpdating(false); }
  }

  function openEditor() {
    if (!task) return;
    setForm({ title: task.title, description: task.description ?? '', priority: task.priority, status: task.status, assigneeId: task.assignee?.id ?? '', dueDate: task.dueDate?.slice(0, 10) ?? '' });
    setEditorOpen(true); setError(''); setNotice('');
  }

  async function save(event: FormEvent) {
    event.preventDefault(); if (!form) return;
    setUpdating(true); setError('');
    const body: UpdateTask = { title: form.title.trim(), description: form.description.trim(), priority: form.priority, status: form.status, assigneeId: form.assigneeId || undefined, dueDate: form.dueDate ? new Date(`${form.dueDate}T12:00:00`).toISOString() : undefined };
    try { setTask(await apiRequest<Task>(`/tasks/${id}`, { method: 'PATCH', body })); setEditorOpen(false); setNotice('Tarefa atualizada com sucesso.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a tarefa.'); }
    finally { setUpdating(false); }
  }

  if (loading) return <div className="detail-state"><span className="spinner" />Carregando tarefa...</div>;
  if (error && !task) return <div className="detail-state detail-error"><strong>Não foi possível abrir a tarefa</strong><p>{error}</p><div><button className="button ghost" onClick={() => void load()}>Tentar novamente</button><Link className="button primary" href="/tasks">Voltar ao Kanban</Link></div></div>;
  if (!task) return null;

  return <>
    <Link className="back-link" href="/tasks">← Voltar para o Kanban</Link>
    <header className="detail-header task-detail-header">
      <div><p className="eyebrow">Tarefa · acompanhamento</p><h1>{task.title}</h1><p>Projeto: <Link href={`/projects/${task.project.id}`}>{task.project.title}</Link></p></div>
      <div className="detail-actions"><span className={`badge priority-${task.priority.toLowerCase()}`}>{labels[task.priority]}</span><span className="badge status">{labels[task.status]}</span>{deadline && <span className={`badge deadline-${deadline.status}`}>{task.status === 'DONE' ? 'Concluída' : deadline.label}</span>}</div>
    </header>
    {notice && <div className="alert success" role="status">{notice}</div>}
    {error && <ErrorState message={error} />}
    <div className="detail-layout task-detail-layout">
      <main className="detail-main">
        <section className="detail-card"><div className="section-head"><div><h2>Visão geral</h2><p>Informações principais e acompanhamento da entrega.</p></div>{canEdit && <button className="button ghost" onClick={openEditor}>Editar tarefa</button>}</div><p className="order-description">{task.description?.trim() || 'Esta tarefa ainda não possui descrição.'}</p><div className="info-grid task-info-grid"><Info label="Responsável" value={task.assignee?.name ?? 'Não informado'} detail={task.assignee?.email}/><Info label="Projeto" value={task.project.title}/><Info label="Prazo" value={task.dueDate ? formatDate(task.dueDate) : 'Sem prazo'}/><Info label="Situação do prazo" value={task.status === 'DONE' ? 'Concluída' : deadline?.label ?? 'Sem prazo'}/><Info label="Data de criação" value={task.createdAt ? formatDate(task.createdAt) : 'Não informada'}/><Info label="Última atualização" value={task.updatedAt ? formatDate(task.updatedAt) : 'Não informada'}/>{task.completedAt && <Info label="Conclusão" value={formatDate(task.completedAt)}/>}</div></section>
        <TargetPanels targetType="task" targetId={id} canContribute={canEdit} />
        <section className="detail-card"><div className="section-head"><div><h2>Registros diários</h2><p>Histórico operacional associado à tarefa.</p></div></div><div className="task-future-state"><span>◷</span><div><strong>Integração em preparação</strong><p>Registros diários vinculados à tarefa serão disponibilizados em etapa futura.</p></div></div></section>
      </main>
      <aside className="summary-card task-actions-card"><h2>Ações rápidas</h2>{canEdit && <label className="quick-status">Alterar status<select value={task.status} disabled={updating} onChange={(event) => void quickStatus(event.target.value as TaskStatus)}>{statuses.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label>}<Link className="button ghost full" href={`/projects/${task.project.id}`}>Voltar para o projeto</Link><Link className="button ghost full" href="/tasks">Voltar para o Kanban</Link><hr/><Info label="Status" value={labels[task.status]}/><Info label="Prioridade" value={labels[task.priority]}/><Info label="Prazo" value={task.status === 'DONE' ? 'Concluída' : deadline?.label ?? 'Sem prazo'}/></aside>
    </div>
    {editorOpen && form && <Modal title="Editar tarefa" eyebrow="Dados principais" onClose={() => !updating && setEditorOpen(false)}><form className="form-grid" onSubmit={save}>{error && <div className="alert error span-2">{error}</div>}<Field label="Título" value={form.title} set={(title) => setForm({...form, title})} required span/><Field label="Descrição" value={form.description} set={(description) => setForm({...form, description})} textarea span/><SelectPriority value={form.priority} set={(priority) => setForm({...form, priority})}/><label>Status<select value={form.status} onChange={(event) => setForm({...form, status: event.target.value as TaskStatus})}>{statuses.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label><label>Responsável<select value={form.assigneeId} onChange={(event) => setForm({...form, assigneeId: event.target.value})}><option value="">Sem responsável</option>{assigneeOptions.filter((item) => item.status === 'ACTIVE' || item.id === task.assignee?.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Prazo<input type="date" value={form.dueDate} onChange={(event) => setForm({...form, dueDate: event.target.value})}/></label><FormActions saving={updating} close={() => setEditorOpen(false)}/></form></Modal>}
  </>;
}

function Info({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="info-item"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>; }

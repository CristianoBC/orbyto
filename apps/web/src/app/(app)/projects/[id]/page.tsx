'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Field, FormActions, SelectPriority } from '@/components/ui/forms';
import { Modal } from '@/components/ui/modal';
import { ErrorState, formatDate, labels } from '@/components/ui/page-state';
import { apiRequest } from '@/lib/api';
import type { Project } from '@/types/project';
import type { CreateTask, Task, TaskStatus } from '@/types/task';

const statuses: TaskStatus[] = ['PLANNED', 'TODO', 'DOING', 'DONE', 'CANCELED'];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState('');
  const [tasksError, setTasksError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [form, setForm] = useState<CreateTask>({ projectId: id, title: '', description: '', priority: 'MEDIUM', status: 'TODO' });

  const loadProject = useCallback(async () => {
    setLoading(true); setError('');
    try { setProject(await apiRequest<Project>(`/projects/${id}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Erro ao carregar o projeto.'); }
    finally { setLoading(false); }
  }, [id]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true); setTasksError('');
    try { setTasks(await apiRequest<Task[]>(`/tasks/project/${id}`)); }
    catch (reason) { setTasksError(reason instanceof Error ? reason.message : 'Erro ao carregar as tarefas.'); }
    finally { setTasksLoading(false); }
  }, [id]);

  useEffect(() => { void loadProject(); void loadTasks(); }, [loadProject, loadTasks]);

  function showTaskModal() {
    setForm({ projectId: id, title: '', description: '', priority: 'MEDIUM', status: 'TODO' });
    setFormError(''); setOpen(true);
  }

  async function createTask(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFormError('');
    try { await apiRequest('/tasks', { method: 'POST', body: form }); setOpen(false); await Promise.all([loadTasks(), loadProject()]); }
    catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Erro ao criar a tarefa.'); }
    finally { setSaving(false); }
  }

  async function updateStatus(taskId: string, status: TaskStatus) {
    setUpdatingId(taskId); setTasksError('');
    try { await apiRequest(`/tasks/${taskId}`, { method: 'PATCH', body: { status } }); await Promise.all([loadTasks(), loadProject()]); }
    catch (reason) { setTasksError(reason instanceof Error ? reason.message : 'Erro ao atualizar o status.'); }
    finally { setUpdatingId(''); }
  }

  if (loading) return <div className="detail-state"><span className="spinner" />Carregando projeto...</div>;
  if (error || !project) return <div className="detail-state detail-error"><strong>Não foi possível abrir o projeto</strong><p>{error || 'Projeto não encontrado.'}</p><div><button className="button ghost" onClick={() => void loadProject()}>Tentar novamente</button><Link className="button primary" href="/projects">Voltar para projetos</Link></div></div>;

  return <>
    <Link className="back-link" href="/projects">← Voltar para projetos</Link>
    <header className="detail-header"><div><p className="eyebrow">Projeto · acompanhamento</p><h1>{project.name}</h1><p>Criado em {formatDate(project.createdAt)} · atualizado em {formatDate(project.updatedAt)}</p></div><div className="detail-actions"><span className={`badge priority-${project.priority.toLowerCase()}`}>{labels[project.priority]}</span><span className="badge status">{labels[project.status]}</span><button className="button primary" onClick={showTaskModal}>+ Nova tarefa</button></div></header>
    <div className="detail-layout"><main className="detail-main">
      <section className="detail-card"><h2>Visão geral</h2><p className="order-description">{project.description || 'Este projeto ainda não possui descrição.'}</p><div className="info-grid project-info-grid"><Info label="Departamento" value={project.department || 'Não informado'} /><Info label="Unidade" value={project.unit || 'Não informada'} /><Info label="Responsável" value={project.owner?.name || 'Não informado'} detail={project.owner?.email} /></div>{!!project.tags?.length && <div className="project-tags"><span>Tags</span><div>{project.tags.map((tag) => <span className="badge" key={tag}>{tag}</span>)}</div></div>}</section>
      <section className="detail-card"><div className="section-head"><div><h2>Tarefas do projeto</h2><p>Acompanhe responsáveis, prioridades e prazos.</p></div><span>{tasks.length}</span></div>
        {tasksError && <ErrorState message={tasksError} retry={loadTasks} />}
        {tasksLoading ? <div className="inline-loading"><span className="spinner" />Carregando tarefas...</div> : !tasks.length ? <div className="project-tasks-empty"><span>✓</span><strong>Nenhuma tarefa cadastrada</strong><p>Crie a primeira tarefa para começar a organizar as entregas.</p><button className="button ghost" onClick={showTaskModal}>Criar tarefa</button></div> : <div className="project-task-list">{tasks.map((task) => <article className="project-task" key={task.id}><div className="task-copy"><div className="task-title-row"><h3>{task.title}</h3><span className={`badge priority-${task.priority.toLowerCase()}`}>{labels[task.priority]}</span></div><p>{task.description || 'Tarefa sem descrição.'}</p><small>{task.assignee?.name ? `Responsável: ${task.assignee.name}` : 'Sem responsável'} · Prazo: {task.dueDate ? formatDate(task.dueDate) : 'não definido'}</small></div><label className="quick-status">Status<select value={task.status} disabled={updatingId === task.id} onChange={(event) => void updateStatus(task.id, event.target.value as TaskStatus)}>{statuses.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label></article>)}</div>}
      </section>
    </main><aside className="summary-card"><h2>Resumo do projeto</h2><Info label="Status" value={labels[project.status]} /><Info label="Prioridade" value={labels[project.priority]} /><Info label="Tarefas" value={String(project.taskCounts?.tasks ?? tasks.length)} /><Info label="Concluídas" value={String(project.taskCounts?.completedTasks ?? tasks.filter((task) => task.status === 'DONE').length)} /><Info label="Última atualização" value={formatDate(project.updatedAt)} /></aside></div>
    {open && <Modal title="Nova tarefa" eyebrow="Projeto" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={createTask}>{formError && <div className="alert error span-2">{formError}</div>}<Field label="Título" value={form.title} set={(title) => setForm({ ...form, title })} required span /><Field label="Descrição" value={form.description ?? ''} set={(description) => setForm({ ...form, description })} textarea span /><SelectPriority value={form.priority} set={(priority) => setForm({ ...form, priority })} /><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>{statuses.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label><FormActions saving={saving} close={() => setOpen(false)} /></form></Modal>}
  </>;
}

function Info({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="info-item"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

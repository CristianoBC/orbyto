'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/forms';
import { ErrorState, LoadingState, formatDate } from '@/components/ui/page-state';
import { apiRequest } from '@/lib/api';
import type { Priority } from '@/types/service-order';
import type { Task, TaskStatus } from '@/types/task';
import { useAuth } from '@/contexts/auth-context';
import { taskDeadline } from '@/lib/deadline';
import { Modal } from '@/components/ui/modal';
import { TargetPanels } from '@/components/collaboration/target-panels';

const columns: { status: TaskStatus; label: string; hint: string }[] = [
  { status: 'PLANNED', label: 'Planejado', hint: 'Atividades previstas' },
  { status: 'TODO', label: 'A fazer', hint: 'Prontas para iniciar' },
  { status: 'DOING', label: 'Em andamento', hint: 'Trabalho em curso' },
  { status: 'DONE', label: 'Concluído', hint: 'Atividades finalizadas' },
  { status: 'CANCELED', label: 'Cancelado', hint: 'Itens descontinuados' },
];

const priorityLabels: Record<Priority, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
};

export default function TasksPage() {
  const { can, user } = useAuth();
  const canEdit = can('TASKS', 'edit');
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [textFilter, setTextFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiRequest<Task[]>(user?.role === 'VIEWER' ? '/tasks' : '/tasks/my'));
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao carregar as tarefas.');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { void load(); }, [load]);

  const filteredItems = useMemo(() => {
    const query = textFilter.trim().toLocaleLowerCase('pt-BR');
    return items.filter((item) => {
      const searchable = `${item.title} ${item.description ?? ''} ${item.project?.title ?? ''} ${item.assignee?.name ?? ''}`.toLocaleLowerCase('pt-BR');
      return (!query || searchable.includes(query))
        && (priorityFilter === 'ALL' || item.priority === priorityFilter)
        && (statusFilter === 'ALL' || item.status === statusFilter);
    });
  }, [items, priorityFilter, statusFilter, textFilter]);

  async function updateStatus(task: Task, status: TaskStatus) {
    if (task.status === status || updatingId) return;
    const previousStatus = task.status;
    setUpdatingId(task.id);
    setUpdateError('');
    setItems((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      const updated = await apiRequest<Task>(`/tasks/${task.id}`, { method: 'PATCH', body: { status } });
      setItems((current) => current.map((item) => item.id === task.id ? updated : item));
    } catch (requestError) {
      setItems((current) => current.map((item) => item.id === task.id ? { ...item, status: previousStatus } : item));
      setUpdateError(requestError instanceof Error ? requestError.message : 'Não foi possível alterar o status da tarefa.');
    } finally {
      setUpdatingId(null);
    }
  }

  const hasFilters = Boolean(textFilter) || priorityFilter !== 'ALL' || statusFilter !== 'ALL';

  return <>
    <PageHeader title="Tarefas" text="Acompanhe o fluxo das suas atividades, prioridades e prazos." />
    {user?.role !== 'VIEWER' && <div className="alert info task-scope-notice">Este Kanban exibe somente as tarefas atribuídas a você.</div>}

    <section className="kanban-toolbar" aria-label="Filtros de tarefas">
      <label className="kanban-search">
        <span>Buscar</span>
        <div><span aria-hidden="true">⌕</span><input value={textFilter} onChange={(event) => setTextFilter(event.target.value)} placeholder="Título, descrição, projeto ou responsável" /></div>
      </label>
      <label><span>Prioridade</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as Priority | 'ALL')}>
        <option value="ALL">Todas</option>
        {(Object.keys(priorityLabels) as Priority[]).map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
      </select></label>
      <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TaskStatus | 'ALL')}>
        <option value="ALL">Todos</option>
        {columns.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
      </select></label>
      {hasFilters && <button className="kanban-clear" onClick={() => { setTextFilter(''); setPriorityFilter('ALL'); setStatusFilter('ALL'); }}>Limpar filtros</button>}
    </section>

    {updateError && <ErrorState message={updateError} />}
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <LoadingState /> : items.length === 0 ? <div className="state-card empty"><span aria-hidden="true">◇</span><strong>Nenhuma tarefa atribuída</strong><p>Quando uma tarefa for atribuída a você, ela aparecerá neste quadro.</p></div> : <>
      <div className="kanban-summary"><strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? 'tarefa encontrada' : 'tarefas encontradas'}</div>
      <div className="kanban-board">
        {columns.map((column) => {
          const columnItems = filteredItems.filter((item) => item.status === column.status);
          return <section className={`kanban-column status-${column.status.toLowerCase()}`} key={column.status} aria-labelledby={`column-${column.status}`}>
            <header><div><span className="kanban-dot" /><div><h2 id={`column-${column.status}`}>{column.label}</h2><p>{column.hint}</p></div></div><strong>{columnItems.length}</strong></header>
            <div className="kanban-cards">
              {columnItems.length === 0 ? <div className="kanban-column-empty">Nenhuma tarefa nesta etapa</div> : columnItems.map((task) => <article className={`task-card${taskDeadline(task).status === 'overdue' ? ' deadline-card-overdue' : ''}`} key={task.id}>
                <div className="task-card-top"><span className={`badge priority-${task.priority.toLowerCase()}`}>{priorityLabels[task.priority]}</span><span className={`badge deadline-${taskDeadline(task).status}`}>{taskDeadline(task).label}</span>{task.project && <span className="task-project" title={task.project.title}>{task.project.title}</span>}</div>
                <h3>{task.title}</h3>
                <p className="task-description">{task.description?.trim() || 'Sem descrição informada.'}</p>
                <div className="task-meta">
                  <div><span>Responsável</span><strong>{task.assignee?.name ?? 'Não informado'}</strong></div>
                  <div><span>Prazo</span><strong>{formatDate(task.dueDate)}</strong></div>
                </div>
                <button type="button" className="button ghost small" onClick={() => setSelectedTask(task)}>Comentários e anexos</button>
                {canEdit && <label className="task-status-control"><span>Status</span><select value={task.status} disabled={updatingId === task.id} onChange={(event) => void updateStatus(task, event.target.value as TaskStatus)} aria-label={`Alterar status de ${task.title}`}>
                  {columns.map((option) => <option key={option.status} value={option.status}>{option.label}</option>)}
                </select>{updatingId === task.id && <span className="spinner" aria-label="Atualizando status" />}</label>}
              </article>)}
            </div>
          </section>;
        })}
      </div>
    </>}
    {selectedTask && <Modal title={selectedTask.title} eyebrow="Colaboração da tarefa" onClose={() => setSelectedTask(null)}><div className="task-collaboration"><TargetPanels targetType="task" targetId={selectedTask.id} canContribute={can('TASKS', 'edit') || can('TASKS', 'manage')} /></div></Modal>}
  </>;
}

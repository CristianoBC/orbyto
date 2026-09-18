"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Field, FormActions, SelectPriority } from "@/components/ui/forms";
import { Modal } from "@/components/ui/modal";
import { DailyLogList } from "@/components/daily-logs/daily-log-list";
import { DailyLogModal } from "@/components/daily-logs/daily-log-modal";
import { TargetPanels } from "@/components/collaboration/target-panels";
import { ErrorState, formatDate, labels } from "@/components/ui/page-state";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/api";
import { projectDeadline, taskDeadline } from "@/lib/deadline";
import type { User } from "@/types/auth";
import type { Project, ProjectStatus, UpdateProject } from "@/types/project";
import type { CreateTask, Task, TaskStatus, UpdateTask } from "@/types/task";
import type { DailyLog } from "@/types/daily-log";

const statuses: TaskStatus[] = ["PLANNED", "TODO", "DOING", "DONE", "CANCELED"];
const projectStatuses: ProjectStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "CANCELED",
];
const emptyForm = (projectId: string): CreateTask => ({
  projectId,
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  assigneeId: "",
  dueDate: "",
});
type ProjectForm = Omit<UpdateProject, "tags"> & {
  tags: string;
  ownerId: string;
  startDate: string;
  endDate: string;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, can } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [canListUsers, setCanListUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasksError, setTasksError] = useState("");
  const [dailyLogsLoading, setDailyLogsLoading] = useState(true);
  const [dailyLogsError, setDailyLogsError] = useState("");
  const [dailyLogOpen, setDailyLogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [form, setForm] = useState<CreateTask>(emptyForm(id));
  const [projectForm, setProjectForm] = useState<ProjectForm | null>(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectFormError, setProjectFormError] = useState("");
  const canEditProject = can("PROJECTS", "edit") && !!project &&
    (["OWNER", "ADMIN", "MANAGER"].includes(user?.role ?? "") || project.owner?.id === user?.id);
  const canCreateTask = can("TASKS", "create");
  const canEditTask = can("TASKS", "edit");
  const canCreateDailyLog = can("DAILY_LOGS", "create");
  const canChangeOwner = can("PROJECTS", "manage");
  const canDeleteProject = can("PROJECTS", "delete") && ["OWNER", "ADMIN"].includes(user?.role ?? "");
  const responsibleOptions =
    editing?.assignee && !users.some((item) => item.id === editing.assignee?.id)
      ? [
          {
            ...editing.assignee,
            tenantId: user?.tenantId ?? "",
            role: "MEMBER" as const,
            status: "ACTIVE" as const,
            createdAt: "",
          },
          ...users,
        ]
      : users;

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProject(await apiRequest<Project>(`/projects/${id}`));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erro ao carregar o projeto.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError("");
    try {
      setTasks(await apiRequest<Task[]>(`/tasks/project/${id}`));
    } catch (reason) {
      setTasksError(
        reason instanceof Error
          ? reason.message
          : "Erro ao carregar as tarefas.",
      );
    } finally {
      setTasksLoading(false);
    }
  }, [id]);

  const loadDailyLogs = useCallback(async () => {
    setDailyLogsLoading(true);
    setDailyLogsError("");
    try {
      setDailyLogs(await apiRequest<DailyLog[]>(`/daily-logs/project/${id}`));
    } catch (reason) {
      setDailyLogsError(
        reason instanceof Error
          ? reason.message
          : "Erro ao carregar os registros diários.",
      );
    } finally {
      setDailyLogsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProject();
    void loadTasks();
    void loadDailyLogs();
  }, [loadProject, loadTasks, loadDailyLogs]);
  useEffect(() => {
    if (!user) return;
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      setUsers([{ ...user, createdAt: "" }]);
      setCanListUsers(false);
      return;
    }
    apiRequest<User[]>("/users")
      .then((tenantUsers) => {
        setUsers(tenantUsers);
        setCanListUsers(true);
      })
      .catch(() => {
        setUsers([{ ...user, createdAt: "" }]);
        setCanListUsers(false);
      });
  }, [user]);

  function showTaskModal() {
    setEditing(null);
    setForm({ ...emptyForm(id), assigneeId: user?.id ?? "" });
    setFormError("");
    setNotice("");
    setOpen(true);
  }

  function showProjectEditor() {
    if (!project) return;
    setProjectForm({
      name: project.name,
      description: project.description ?? "",
      department: project.department ?? "",
      unit: project.unit ?? "",
      priority: project.priority,
      status: project.status,
      tags: project.tags?.join(", ") ?? "",
      ownerId: project.owner?.id ?? "",
      startDate: project.startDate?.slice(0, 10) ?? "",
      endDate: project.dueDate?.slice(0, 10) ?? "",
    });
    setProjectFormError("");
    setNotice("");
    setProjectEditorOpen(true);
  }

  async function saveProject(event: FormEvent) {
    event.preventDefault();
    if (!projectForm) return;
    const name = projectForm.name.trim();
    if (name.length < 3) {
      setProjectFormError("Informe um nome com pelo menos 3 caracteres.");
      return;
    }
    setProjectSaving(true);
    setProjectFormError("");
    setNotice("");
    const body: UpdateProject = {
      name,
      description: projectForm.description?.trim() ?? "",
      department: projectForm.department?.trim() ?? "",
      unit: projectForm.unit?.trim() ?? "",
      priority: projectForm.priority,
      status: projectForm.status,
      tags: projectForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      startDate: projectForm.startDate
        ? new Date(`${projectForm.startDate}T12:00:00`).toISOString()
        : null,
      endDate: projectForm.endDate
        ? new Date(`${projectForm.endDate}T12:00:00`).toISOString()
        : null,
      ...(canChangeOwner && projectForm.ownerId
        ? { ownerId: projectForm.ownerId }
        : {}),
    };
    try {
      await apiRequest(`/projects/${id}`, { method: "PATCH", body });
      setProjectEditorOpen(false);
      setNotice("Projeto atualizado com sucesso.");
      await loadProject();
    } catch (reason) {
      setProjectFormError(
        reason instanceof Error
          ? reason.message
          : "Erro ao atualizar o projeto.",
      );
    } finally {
      setProjectSaving(false);
    }
  }

  async function deleteProject() {
    if (!project) return;
    const confirmation = window.prompt(`Esta ação é irreversível. Para excluir o projeto, digite exatamente: ${project.name}`);
    if (confirmation !== project.name) return;
    setError(""); setNotice("");
    try {
      await apiRequest(`/projects/${id}`, { method: "DELETE" });
      router.push("/projects");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o projeto.");
    }
  }

  function showEditModal(task: Task) {
    setEditing(task);
    setForm({
      projectId: id,
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      assigneeId: task.assignee?.id ?? "",
      dueDate: task.dueDate?.slice(0, 10) ?? "",
    });
    setFormError("");
    setNotice("");
    setOpen(true);
  }

  async function saveTask(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setNotice("");
    const shared: UpdateTask = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      status: form.status,
      assigneeId: form.assigneeId || undefined,
      dueDate: form.dueDate
        ? new Date(`${form.dueDate}T12:00:00`).toISOString()
        : undefined,
    };
    try {
      if (editing)
        await apiRequest(`/tasks/${editing.id}`, {
          method: "PATCH",
          body: shared,
        });
      else
        await apiRequest("/tasks", {
          method: "POST",
          body: { projectId: id, ...shared },
        });
      setOpen(false);
      setNotice(
        editing
          ? "Tarefa atualizada com sucesso."
          : "Tarefa criada com sucesso.",
      );
      await Promise.all([loadTasks(), loadProject()]);
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "Erro ao salvar a tarefa.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(taskId: string, status: TaskStatus) {
    setUpdatingId(taskId);
    setTasksError("");
    setNotice("");
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: "PATCH",
        body: { status },
      });
      await Promise.all([loadTasks(), loadProject()]);
    } catch (reason) {
      setTasksError(
        reason instanceof Error
          ? reason.message
          : "Erro ao atualizar o status.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  async function dailyLogSaved(message: string) {
    setDailyLogOpen(false);
    setNotice(message);
    await loadDailyLogs();
  }

  if (loading)
    return (
      <div className="detail-state">
        <span className="spinner" />
        Carregando projeto...
      </div>
    );
  if (error || !project)
    return (
      <div className="detail-state detail-error">
        <strong>Não foi possível abrir o projeto</strong>
        <p>{error || "Projeto não encontrado."}</p>
        <div>
          <button className="button ghost" onClick={() => void loadProject()}>
            Tentar novamente
          </button>
          <Link className="button primary" href="/projects">
            Voltar para projetos
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <Link className="back-link" href="/projects">
        ← Voltar para projetos
      </Link>
      <header className="detail-header">
        <div>
          <p className="eyebrow">Projeto · acompanhamento</p>
          <h1>{project.name}</h1>
          <p>
            Criado em {formatDate(project.createdAt)} · atualizado em{" "}
            {formatDate(project.updatedAt)}
          </p>
        </div>
        <div className="detail-actions">
          <span className={`badge priority-${project.priority.toLowerCase()}`}>
            {labels[project.priority]}
          </span>
          <span className="badge status">{labels[project.status]}</span>
          {canEditProject && (
            <button className="button ghost" onClick={showProjectEditor}>
              Editar projeto
            </button>
          )}
          {canDeleteProject && (
            <button className="button danger-ghost" onClick={() => void deleteProject()}>
              Excluir projeto
            </button>
          )}
          {canCreateTask && <button className="button primary" onClick={showTaskModal}>
            + Nova tarefa
          </button>}
        </div>
      </header>
      {notice && <div className="alert success">{notice}</div>}
      <div className="detail-layout">
        <main className="detail-main">
          <section className="detail-card">
            <h2>Visão geral</h2>
            <p className="order-description">
              {project.description ||
                "Este projeto ainda não possui descrição."}
            </p>
            <div className="info-grid project-info-grid">
              <Info
                label="Departamento"
                value={project.department || "Não informado"}
              />
              <Info label="Unidade" value={project.unit || "Não informada"} />
              <Info
                label="Responsável"
                value={project.owner?.name || "Não informado"}
                detail={project.owner?.email}
              />
              <Info label="Data de início" value={formatDate(project.startDate)} />
              <Info label="Prazo previsto" value={formatDate(project.dueDate)} />
              <Info label="Situação do prazo" value={projectDeadline(project).label} />
              <Info label="Conclusão real" value={project.finishedAt ? formatDate(project.finishedAt) : "Ainda não concluído"} />
            </div>
            {!!project.tags?.length && (
              <div className="project-tags">
                <span>Tags</span>
                <div>
                  {project.tags.map((tag) => (
                    <span className="badge" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="detail-card">
            <div className="section-head">
              <div>
                <h2>Tarefas do projeto</h2>
                <p>Acompanhe responsáveis, prioridades e prazos.</p>
              </div>
              <span>{tasks.length}</span>
            </div>
            {tasksError && (
              <ErrorState message={tasksError} retry={loadTasks} />
            )}
            {tasksLoading ? (
              <div className="inline-loading">
                <span className="spinner" />
                Carregando tarefas...
              </div>
            ) : !tasks.length ? (
              <div className="project-tasks-empty">
                <span>✓</span>
                <strong>Nenhuma tarefa cadastrada</strong>
                <p>
                  Crie a primeira tarefa para começar a organizar as entregas.
                </p>
                {canCreateTask && <button className="button ghost" onClick={showTaskModal}>
                  Criar tarefa
                </button>}
              </div>
            ) : (
              <div className="project-task-list">
                {tasks.map((task) => (
                  <article className="project-task" key={task.id}>
                    <div className="task-copy">
                      <div className="task-title-row">
                        <h3><Link href={`/tasks/${task.id}`}>{task.title}</Link></h3>
                        <span
                          className={`badge priority-${task.priority.toLowerCase()}`}
                        >
                          {labels[task.priority]}
                        </span>
                      </div>
                      <p>{task.description || "Tarefa sem descrição."}</p>
                      <small>
                        {task.assignee?.name
                          ? `Responsável: ${task.assignee.name}`
                          : "Sem responsável"}{" "}
                        · Prazo: {taskDeadline(task).label} ·{" "}
                        {task.dueDate
                          ? formatDate(task.dueDate)
                          : "não definido"}
                      </small>
                    </div>
                    <div className="project-task-actions">
                      <Link className="button ghost task-edit-button" href={`/tasks/${task.id}`}>Ver detalhes</Link>
                      {canEditTask && <>
                        <button
                          className="button ghost task-edit-button"
                          onClick={() => showEditModal(task)}
                        >
                          Editar
                        </button>
                        <label className="quick-status">
                        Status
                        <select
                          value={task.status}
                          disabled={updatingId === task.id}
                          onChange={(event) =>
                            void updateStatus(
                              task.id,
                              event.target.value as TaskStatus,
                            )
                          }
                        >
                          {statuses.map((status) => (
                            <option value={status} key={status}>
                              {labels[status]}
                            </option>
                          ))}
                        </select>
                        </label>
                      </>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="detail-card">
            <div className="section-head">
              <div><h2>Registros Diários</h2><p>Acompanhe a evolução e as horas dedicadas ao projeto.</p></div>
              {canCreateDailyLog && <button className="button ghost section-action" onClick={() => { setNotice(""); setDailyLogOpen(true); }}>+ Novo registro</button>}
            </div>
            {dailyLogsError && <ErrorState message={dailyLogsError} retry={loadDailyLogs} />}
            {dailyLogsLoading ? (
              <div className="inline-loading"><span className="spinner" />Carregando registros...</div>
            ) : !dailyLogs.length ? (
              <div className="project-tasks-empty"><span>◷</span><strong>Nenhum registro diário</strong><p>Nenhum registro foi encontrado para este projeto.</p>{canCreateDailyLog && <button className="button ghost" onClick={() => setDailyLogOpen(true)}>Criar registro</button>}</div>
            ) : <DailyLogList items={dailyLogs} compact />}
          </section>
          <TargetPanels targetType="project" targetId={id} canContribute={can("PROJECTS", "edit") || can("PROJECTS", "manage")} />
        </main>
        <aside className="summary-card">
          <h2>Resumo do projeto</h2>
          <Info label="Status" value={labels[project.status]} />
          <Info label="Prioridade" value={labels[project.priority]} />
          <Info label="Período planejado" value={`${formatDate(project.startDate)} — ${formatDate(project.dueDate)}`} />
          {project.finishedAt && <Info label="Conclusão real" value={formatDate(project.finishedAt)} />}
          <Info
            label="Tarefas"
            value={String(project.taskCounts?.tasks ?? tasks.length)}
          />
          <Info
            label="Concluídas"
            value={String(
              project.taskCounts?.completedTasks ??
                tasks.filter((task) => task.status === "DONE").length,
            )}
          />
          <Info
            label="Última atualização"
            value={formatDate(project.updatedAt)}
          />
        </aside>
      </div>
      {open && (
        <Modal
          title={editing ? "Editar tarefa" : "Nova tarefa"}
          eyebrow="Projeto"
          onClose={() => setOpen(false)}
        >
          <form className="form-grid" onSubmit={saveTask}>
            {formError && <div className="alert error span-2">{formError}</div>}
            <Field
              label="Título"
              value={form.title}
              set={(title) => setForm({ ...form, title })}
              required
              span
            />
            <Field
              label="Descrição"
              value={form.description ?? ""}
              set={(description) => setForm({ ...form, description })}
              textarea
              span
            />
            <SelectPriority
              value={form.priority}
              set={(priority) => setForm({ ...form, priority })}
            />
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as TaskStatus })
                }
              >
                {statuses.map((status) => (
                  <option value={status} key={status}>
                    {labels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Responsável
              <select
                value={form.assigneeId ?? ""}
                onChange={(event) =>
                  setForm({ ...form, assigneeId: event.target.value })
                }
              >
                {!editing?.assignee && (
                  <option value="">Sem responsável</option>
                )}
                {responsibleOptions.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                    {item.id === user?.id ? " (você)" : ""}
                  </option>
                ))}
              </select>
              {!canListUsers && (
                <small className="field-help">
                  Sua permissão permite atribuir a tarefa apenas a você.
                </small>
              )}
            </label>
            <label>
              Prazo
              <input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
              />
            </label>
            <FormActions saving={saving} close={() => setOpen(false)} />
          </form>
        </Modal>
      )}
      {dailyLogOpen && project && (
        <DailyLogModal projects={[project]} fixedProjectId={id} onClose={() => setDailyLogOpen(false)} onSaved={dailyLogSaved} />
      )}
      {projectEditorOpen && projectForm && (
        <Modal
          title="Editar projeto"
          eyebrow="Dados principais"
          onClose={() => !projectSaving && setProjectEditorOpen(false)}
        >
          <form className="form-grid" onSubmit={saveProject}>
            {projectFormError && (
              <div className="alert error span-2" role="alert">
                {projectFormError}
              </div>
            )}
            <Field
              label="Nome"
              value={projectForm.name}
              set={(name) => setProjectForm({ ...projectForm, name })}
              required
              span
            />
            <Field
              label="Descrição"
              value={projectForm.description ?? ""}
              set={(description) =>
                setProjectForm({ ...projectForm, description })
              }
              textarea
              span
            />
            <Field
              label="Departamento"
              value={projectForm.department ?? ""}
              set={(department) =>
                setProjectForm({ ...projectForm, department })
              }
            />
            <Field
              label="Unidade"
              value={projectForm.unit ?? ""}
              set={(unit) => setProjectForm({ ...projectForm, unit })}
            />
            <label>
              Data de início
              <input type="date" value={projectForm.startDate} onChange={(event) => setProjectForm({ ...projectForm, startDate: event.target.value })} />
            </label>
            <label>
              Prazo previsto
              <input type="date" min={projectForm.startDate || undefined} value={projectForm.endDate} onChange={(event) => setProjectForm({ ...projectForm, endDate: event.target.value })} />
            </label>
            <SelectPriority
              value={projectForm.priority}
              set={(priority) => setProjectForm({ ...projectForm, priority })}
            />
            <label>
              Status
              <select
                value={projectForm.status}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    status: event.target.value as ProjectStatus,
                  })
                }
              >
                {projectStatuses.map((status) => (
                  <option value={status} key={status}>
                    {labels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Tags
              <input
                value={projectForm.tags}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, tags: event.target.value })
                }
                placeholder="Ex.: interno, melhoria, urgente"
              />
              <small className="field-help">Separe as tags por vírgulas.</small>
            </label>
            {canChangeOwner && (
              <label className="span-2">
                Responsável
                <select
                  value={projectForm.ownerId}
                  disabled={!canListUsers}
                  required
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      ownerId: event.target.value,
                    })
                  }
                >
                  <option value="" disabled>
                    {canListUsers
                      ? "Selecione um responsável"
                      : "Carregando responsáveis..."}
                  </option>
                  {users
                    .filter((item) => item.status === "ACTIVE")
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name} · {item.email}
                      </option>
                    ))}
                </select>
                {!canListUsers && (
                  <small className="field-help">
                    Não foi possível carregar os usuários do ambiente.
                  </small>
                )}
              </label>
            )}
            <FormActions
              saving={projectSaving}
              close={() => setProjectEditorOpen(false)}
            />
          </form>
        </Modal>
      )}
    </>
  );
}

function Info({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

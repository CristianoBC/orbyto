'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import type { CreateProject, Project, ProjectStatus } from '@/types/project';
import { EmptyState, ErrorState, formatDate, labels, LoadingState } from '@/components/ui/page-state';
import { Modal } from '@/components/ui/modal';
import { Field, FormActions, PageHeader, SelectPriority } from '@/components/ui/forms';
import { useAuth } from '@/contexts/auth-context';

const initial: CreateProject = { name: '', description: '', department: '', unit: '', priority: 'MEDIUM', status: 'PLANNED', startDate: '', endDate: '' };
const statuses: ProjectStatus[] = ['PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELED'];
const toIso = (date?: string) => date ? new Date(`${date}T12:00:00`).toISOString() : undefined;

export default function ProjectsPage() {
  const { can, user } = useAuth();
  const canCreate = can('PROJECTS', 'create');
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await apiRequest<Project[]>(user?.role === 'VIEWER' ? '/projects' : '/projects/my')); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); } finally { setLoading(false); } }, [user?.role]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      const { startDate, endDate, ...fields } = form;
      await apiRequest('/projects', { method: 'POST', body: { ...fields, ...(startDate ? { startDate: toIso(startDate) } : {}), ...(endDate ? { endDate: toIso(endDate) } : {}) } });
      setOpen(false); setForm(initial); await load();
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Erro ao salvar.'); } finally { setSaving(false); }
  }

  return <>
    <PageHeader title="Projetos" text="Organize iniciativas, responsáveis e entregas." action={canCreate ? () => setOpen(true) : undefined} label={canCreate ? 'Novo projeto' : undefined} />
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <LoadingState /> : !items.length ? <EmptyState text="Crie seu primeiro projeto para organizar as entregas." /> : <div className="data-list">{items.map((item) =>
      <Link className="data-card project-card-link" href={`/projects/${item.id}`} key={item.id} aria-label={`Abrir projeto ${item.name}`}>
        <div className="data-main"><span className="item-icon violet">◇</span><div><h3>{item.name}</h3><p>{item.description || 'Projeto sem descrição.'}</p><small>{item.department || 'Sem departamento'} · {item.unit || 'Unidade não informada'} · Prazo: {item.dueDate ? formatDate(item.dueDate) : 'sem prazo definido'}</small></div></div>
        <div className="project-card-end"><div className="badges"><span className={`badge priority-${item.priority.toLowerCase()}`}>{labels[item.priority]}</span><span className="badge status">{labels[item.status]}</span></div><span className="card-arrow" aria-hidden="true">→</span></div>
      </Link>)}</div>}
    {open && <Modal title="Novo projeto" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}>
      {formError && <div className="alert error span-2">{formError}</div>}
      <Field label="Nome" value={form.name} set={(name) => setForm({ ...form, name })} required span />
      <Field label="Descrição" value={form.description ?? ''} set={(description) => setForm({ ...form, description })} textarea span />
      <Field label="Departamento" value={form.department ?? ''} set={(department) => setForm({ ...form, department })} />
      <Field label="Unidade" value={form.unit ?? ''} set={(unit) => setForm({ ...form, unit })} />
      <label>Data de início<input type="date" value={form.startDate ?? ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
      <label>Prazo previsto<input type="date" min={form.startDate || undefined} value={form.endDate ?? ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
      <SelectPriority value={form.priority} set={(priority) => setForm({ ...form, priority })} />
      <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
      <FormActions saving={saving} close={() => setOpen(false)} />
    </form></Modal>}
  </>;
}

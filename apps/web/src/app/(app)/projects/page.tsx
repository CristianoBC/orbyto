'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { CreateProject, Project, ProjectStatus } from '@/types/project';
import { EmptyState, ErrorState, formatDate, labels, LoadingState } from '@/components/ui/page-state';
import { Modal } from '@/components/ui/modal';
import { Field, FormActions, PageHeader, SelectPriority } from '@/components/ui/forms';

const initial: CreateProject = { name: '', description: '', department: '', unit: '', priority: 'MEDIUM', status: 'PLANNED' };
export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [open, setOpen] = useState(false); const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems(await apiRequest('/projects/my')); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  async function submit(e: FormEvent) { e.preventDefault(); setSaving(true); setFormError(''); try { await apiRequest('/projects', { method: 'POST', body: form }); setOpen(false); setForm(initial); await load(); } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Erro ao salvar.'); } finally { setSaving(false); } }
  return <><PageHeader title="Projetos" text="Organize iniciativas, responsáveis e entregas." action={() => setOpen(true)} label="Novo projeto" />
    {error && <ErrorState message={error} retry={load} />}{loading ? <LoadingState /> : !items.length ? <EmptyState text="Crie seu primeiro projeto para organizar as entregas." /> : <div className="data-list">{items.map((item) => <article className="data-card" key={item.id}><div className="data-main"><span className="item-icon violet">◇</span><div><h3>{item.name}</h3><p>{item.description || 'Projeto sem descrição.'}</p><small>{item.department || 'Sem departamento'} · {item.unit || 'Unidade não informada'} · {formatDate(item.createdAt)}</small></div></div><div className="badges"><span className={`badge priority-${item.priority.toLowerCase()}`}>{labels[item.priority]}</span><span className="badge status">{labels[item.status]}</span></div></article>)}</div>}
    {open && <Modal title="Novo projeto" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}>{formError && <div className="alert error span-2">{formError}</div>}<Field label="Nome" value={form.name} set={(name) => setForm({ ...form, name })} required span /><Field label="Descrição" value={form.description ?? ''} set={(description) => setForm({ ...form, description })} textarea span /><Field label="Departamento" value={form.department ?? ''} set={(department) => setForm({ ...form, department })} /><Field label="Unidade" value={form.unit ?? ''} set={(unit) => setForm({ ...form, unit })} /><SelectPriority value={form.priority} set={(priority) => setForm({ ...form, priority })} /><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>{(['PLANNED','IN_PROGRESS','PAUSED','COMPLETED','CANCELED'] as ProjectStatus[]).map((v) => <option key={v} value={v}>{labels[v]}</option>)}</select></label><FormActions saving={saving} close={() => setOpen(false)} /></form></Modal>}
  </>;
}

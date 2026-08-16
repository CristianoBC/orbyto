'use client';

import { FormEvent, useEffect, useState } from 'react';
import { FormActions } from '@/components/ui/forms';
import { Modal } from '@/components/ui/modal';
import { apiRequest } from '@/lib/api';
import type { DailyLog, DailyLogPayload } from '@/types/daily-log';
import type { Project } from '@/types/project';

const today = () => new Date().toLocaleDateString('en-CA');

export function DailyLogModal({ projects, fixedProjectId, editing, onClose, onSaved }: { projects: Project[]; fixedProjectId?: string; editing?: DailyLog | null; onClose(): void; onSaved(message: string): void | Promise<void> }) {
  const [form, setForm] = useState({ projectId: fixedProjectId ?? '', title: '', content: '', logDate: today(), workedHours: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) setForm({ projectId: editing.project?.id ?? '', title: editing.title, content: editing.content ?? '', logDate: editing.logDate.slice(0, 10), workedHours: editing.workedHours == null ? '' : String(editing.workedHours) });
  }, [editing]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const body: DailyLogPayload = {
      ...(!editing && form.projectId ? { projectId: form.projectId } : {}),
      title: form.title.trim(), content: form.content.trim(),
      logDate: new Date(`${form.logDate}T12:00:00`).toISOString(),
      ...(form.workedHours !== '' ? { workedHours: Number(form.workedHours) } : {}),
    };
    try {
      await apiRequest(editing ? `/daily-logs/${editing.id}` : '/daily-logs', { method: editing ? 'PATCH' : 'POST', body });
      await onSaved(editing ? 'Registro diário atualizado com sucesso.' : 'Registro diário criado com sucesso.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o registro.'); }
    finally { setSaving(false); }
  }

  return <Modal title={editing ? 'Editar registro diário' : 'Novo registro diário'} eyebrow="Acompanhamento" onClose={() => !saving && onClose()}>
    <form className="form-grid" onSubmit={submit}>
      {error && <div className="alert error span-2" role="alert">{error}</div>}
      {!editing && <label className="span-2">Projeto<select value={form.projectId} disabled={!!fixedProjectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })}><option value="">Sem projeto vinculado</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>}
      {editing?.project && <div className="form-static span-2"><span>Projeto</span><strong>{editing.project.title}</strong><small>O vínculo do projeto não pode ser alterado pela API atual.</small></div>}
      <label className="span-2">Título<input value={form.title} minLength={3} maxLength={180} required onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      <label className="span-2">Conteúdo<textarea value={form.content} minLength={3} maxLength={10000} required rows={5} onChange={(event) => setForm({ ...form, content: event.target.value })} /></label>
      <label>Data do registro<input type="date" value={form.logDate} required onChange={(event) => setForm({ ...form, logDate: event.target.value })} /></label>
      <label>Horas trabalhadas<input type="number" min="0" max="24" step="0.25" value={form.workedHours} placeholder="Ex.: 2,5" onChange={(event) => setForm({ ...form, workedHours: event.target.value })} /></label>
      <FormActions saving={saving} close={onClose} />
    </form>
  </Modal>;
}

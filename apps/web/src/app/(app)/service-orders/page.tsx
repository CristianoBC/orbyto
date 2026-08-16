'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import type { CreateServiceOrder, ServiceOrder } from '@/types/service-order';
import { EmptyState, ErrorState, formatDate, labels, LoadingState } from '@/components/ui/page-state';
import { Modal } from '@/components/ui/modal';
import { Field, FormActions, PageHeader, SelectPriority } from '@/components/ui/forms';

const initial: CreateServiceOrder = { title: '', description: '', category: '', system: '', unit: '', priority: 'MEDIUM' };
const administrativeRoles = ['OWNER', 'ADMIN', 'MANAGER'];

export default function ServiceOrdersPage() {
  const { user, loading: authLoading, can } = useAuth();
  const canCreate = can('SERVICE_ORDERS', 'create');
  const [items, setItems] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const endpoint = administrativeRoles.includes(user.role) || user.role === 'VIEWER' ? '/service-orders' : '/service-orders/my';
    try {
      setItems(await apiRequest<ServiceOrder[]>(endpoint));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await apiRequest('/service-orders', { method: 'POST', body: form });
      setOpen(false);
      setForm(initial);
      await load();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageHeader title="Ordens de Serviço" text="Visualize e acompanhe as solicitações do ambiente." action={canCreate ? () => setOpen(true) : undefined} label={canCreate ? 'Nova ordem' : undefined} />
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <LoadingState /> : !items.length ? <EmptyState text="Nenhuma ordem de serviço encontrada." /> : <div className="data-list">
      {items.map((item) => <Link className="data-card" href={`/service-orders/${item.id}`} key={item.id}>
        <div className="data-main"><span className="item-icon">▤</span><div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div><small>{item.category || 'Sem categoria'} · {item.system || 'Sistema não informado'} · {formatDate(item.createdAt)}</small></div>
          <div><small>Solicitante: {item.requester?.name || 'Não informado'}{item.requester?.email ? ` · ${item.requester.email}` : ''}</small></div>
        </div></div>
        <div className="badges"><span className={`badge priority-${item.priority?.toLowerCase()}`}>{labels[item.priority ?? 'MEDIUM']}</span><span className="badge status">{labels[item.status]}</span></div>
      </Link>)}
    </div>}
    {open && <Modal title="Nova ordem de serviço" onClose={() => setOpen(false)}><form className="form-grid" onSubmit={submit}>
      {formError && <div className="alert error span-2">{formError}</div>}
      <Field label="Título" value={form.title} set={(title) => setForm({ ...form, title })} required span />
      <Field label="Descrição" value={form.description} set={(description) => setForm({ ...form, description })} required textarea span />
      <Field label="Categoria" value={form.category ?? ''} set={(category) => setForm({ ...form, category })} />
      <Field label="Sistema" value={form.system ?? ''} set={(system) => setForm({ ...form, system })} />
      <Field label="Unidade" value={form.unit ?? ''} set={(unit) => setForm({ ...form, unit })} />
      <SelectPriority value={form.priority ?? 'MEDIUM'} set={(priority) => setForm({ ...form, priority })} />
      <FormActions saving={saving} close={() => setOpen(false)} />
    </form></Modal>}
  </>;
}

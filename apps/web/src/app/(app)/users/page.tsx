'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, labels, LoadingState } from '@/components/ui/page-state';
import { PageHeader } from '@/components/ui/forms';
import { ApiError, apiRequest } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import type { User, UserRole, UserStatus } from '@/types/auth';

const roles: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'REQUESTER', 'VIEWER'];
const statuses: UserStatus[] = ['ACTIVE', 'PENDING', 'INACTIVE', 'BLOCKED'];
const emptyForm = { name: '', email: '', role: 'REQUESTER' as UserRole, status: 'ACTIVE' as UserStatus, temporaryPassword: '', phone: '' };

const errorMessage = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback;
const formatDateTime = (value?: string | null, empty = 'Nunca acessou') => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : empty;

export default function UsersPage() {
  const currentUser = useMemo(() => authStorage.getUser(), []);
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiRequest<User[]>('/users'));
      setError('');
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 403
        ? 'Seu perfil não possui permissão para gerenciar os usuários deste ambiente.'
        : errorMessage(reason, 'Não foi possível carregar os usuários.'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm); setFormError(''); setNotice(''); setCreating(true);
  };
  const openEdit = (user: User) => {
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status, temporaryPassword: '', phone: user.phone ?? '' });
    setFormError(''); setNotice(''); setEditing(user);
  };
  const closeForms = () => { if (!saving) { setCreating(false); setEditing(null); setResetting(null); setFormError(''); setNewPassword(''); } };

  async function saveUser(event: FormEvent) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      if (creating) {
        await apiRequest<User>('/users', { method: 'POST', body: { ...form, phone: form.phone || null } });
        setNotice('Usuário criado com sucesso. Compartilhe a senha temporária por um canal seguro.');
      } else if (editing) {
        await apiRequest<User>(`/users/${editing.id}`, { method: 'PATCH', body: {
          name: form.name, email: form.email, role: form.role, status: form.status, phone: form.phone || null,
        } });
        setNotice('Usuário atualizado com sucesso.');
      }
      setCreating(false); setEditing(null); setFormError(''); await load();
    } catch (reason) { setFormError(errorMessage(reason, 'Não foi possível salvar o usuário.')); }
    finally { setSaving(false); }
  }

  async function toggleStatus(user: User) {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setNotice(''); setError('');
    try {
      await apiRequest<User>(`/users/${user.id}`, { method: 'PATCH', body: { status: nextStatus } });
      setNotice(`Usuário ${nextStatus === 'ACTIVE' ? 'ativado' : 'inativado'} com sucesso.`);
      await load();
    } catch (reason) { setError(errorMessage(reason, 'Não foi possível alterar o status.')); }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (!resetting) return;
    setSaving(true); setFormError('');
    try {
      await apiRequest(`/users/${resetting.id}/reset-password`, { method: 'PATCH', body: { temporaryPassword: newPassword } });
      setNotice('Senha temporária redefinida com sucesso. Compartilhe-a por um canal seguro.');
      setResetting(null); setNewPassword(''); setFormError('');
    } catch (reason) { setFormError(errorMessage(reason, 'Não foi possível redefinir a senha.')); }
    finally { setSaving(false); }
  }

  const allowedRoles = currentUser?.role === 'OWNER' ? roles : roles.filter((role) => role !== 'OWNER');

  return <>
    <PageHeader title="Usuários e permissões" text="Gerencie acessos, perfis e credenciais deste ambiente." action={openCreate} label="Novo usuário" />
    <div className="users-role-note"><strong>Perfil Solicitante</strong><span>O REQUESTER acessa apenas o portal de solicitações para abrir e acompanhar suas ordens de serviço.</span></div>
    {notice && <div className="alert success" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Fechar aviso">×</button></div>}
    {error && <ErrorState message={error} retry={load} />}
    {loading ? <LoadingState /> : !error && !items.length ? <EmptyState text="Nenhum usuário foi encontrado." /> : !error && <div className="user-grid">
      {items.map((item) => {
        const isSelf = item.id === currentUser?.id;
        const cannotManage = currentUser?.role === 'ADMIN' && item.role === 'OWNER';
        return <article className="user-card" key={item.id}>
          <div className="user-card-main"><span className="avatar large">{item.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div><h3>{item.name}{isSelf && <small>Você</small>}</h3><p>{item.email}</p><div className="badges"><span className="badge status">{labels[item.role]}</span><span className={`badge user-${item.status.toLowerCase()}`}>{labels[item.status]}</span></div></div></div>
          <dl className="user-meta"><div><dt>Último login</dt><dd>{formatDateTime(item.lastLoginAt)}</dd></div><div><dt>Criado em</dt><dd>{formatDateTime(item.createdAt, '—')}</dd></div></dl>
          <div className="user-actions">
            <button className="button ghost small" disabled={cannotManage} onClick={() => openEdit(item)}>Editar</button>
            <button className="button ghost small" disabled={cannotManage} onClick={() => { setFormError(''); setNewPassword(''); setResetting(item); }}>Redefinir senha</button>
            <button className={`button small ${item.status === 'ACTIVE' ? 'danger-ghost' : 'ghost'}`} disabled={isSelf || cannotManage} title={isSelf ? 'Você não pode alterar o próprio status.' : undefined} onClick={() => void toggleStatus(item)}>{item.status === 'ACTIVE' ? 'Inativar' : 'Ativar'}</button>
          </div>
        </article>;
      })}
    </div>}

    {(creating || editing) && <Modal title={creating ? 'Novo usuário' : 'Editar usuário'} eyebrow="Gestão de acessos" onClose={closeForms}>
      <form className="form-grid" onSubmit={saveUser}>
        {formError && <div className="alert error span-2" role="alert">{formError}</div>}
        <label>Nome<input required minLength={2} maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>E-mail<input required type="email" maxLength={320} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Perfil<select value={form.role} disabled={editing?.id === currentUser?.id} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>{allowedRoles.map((role) => <option key={role} value={role}>{labels[role]}</option>)}</select></label>
        <label>Status<select value={form.status} disabled={editing?.id === currentUser?.id} onChange={(event) => setForm({ ...form, status: event.target.value as UserStatus })}>{statuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
        <label>Telefone (opcional)<input maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        {creating && <label>Senha temporária<input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} /><small className="field-help">Use pelo menos 8 caracteres e compartilhe por um canal seguro.</small></label>}
        {form.role === 'REQUESTER' && <div className="alert info span-2">Este usuário terá acesso somente ao portal de solicitações.</div>}
        <div className="form-actions span-2"><button type="button" className="button ghost" disabled={saving} onClick={closeForms}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar usuário'}</button></div>
      </form>
    </Modal>}

    {resetting && <Modal title="Redefinir senha" eyebrow="Credencial temporária" onClose={closeForms}>
      <form className="form-grid" onSubmit={resetPassword}>
        {formError && <div className="alert error span-2" role="alert">{formError}</div>}
        <p className="reset-password-copy span-2">Defina uma nova senha temporária para <strong>{resetting.name}</strong>. A senha não será exibida novamente.</p>
        <label className="span-2">Nova senha temporária<input required autoFocus type="password" minLength={8} maxLength={72} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><small className="field-help">Mínimo de 8 caracteres.</small></label>
        <div className="form-actions span-2"><button type="button" className="button ghost" disabled={saving} onClick={closeForms}>Cancelar</button><button className="button primary" disabled={saving}>{saving ? 'Redefinindo...' : 'Redefinir senha'}</button></div>
      </form>
    </Modal>}
  </>;
}

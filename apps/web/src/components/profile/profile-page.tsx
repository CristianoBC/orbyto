'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { apiRequest } from '@/lib/api';
import { labels, LoadingState } from '@/components/ui/page-state';
import type { PermissionModule, User } from '@/types/auth';
import type { NotificationPreference, NotificationPreferenceForm } from '@/types/notification-preference';

const defaultNotificationPreferences: NotificationPreferenceForm = {
  internalNotificationsEnabled: true, emailNotificationsEnabled: true,
  serviceOrderUpdatesEmail: true, serviceOrderCommentsEmail: true, serviceOrderAttachmentsEmail: true,
  projectUpdatesEmail: true, projectCommentsEmail: true, taskUpdatesEmail: true, taskCommentsEmail: true,
  deadlineAlertsEmail: true, satisfactionAlertsEmail: true, dailySummaryEmail: false,
};

const moduleLabels: Record<PermissionModule, string> = {
  DASHBOARD: 'Dashboard', SERVICE_ORDERS: 'Ordens de Serviço', PROJECTS: 'Projetos', TASKS: 'Tarefas',
  KANBAN: 'Kanban', DAILY_LOGS: 'Registros Diários', SCHEDULE: 'Cronograma', USERS: 'Usuários',
  REQUESTER_PORTAL: 'Portal do Solicitante',
  SETTINGS: 'Configurações',
  LOOKUPS: 'Cadastros Auxiliares',
  SATISFACTION: 'Satisfação',
};
const allAdminModules = Object.keys(moduleLabels).filter((module) => module !== 'REQUESTER_PORTAL') as PermissionModule[];
const formatDateTime = (value?: string | null, empty = 'Nunca acessou') => value
  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)) : empty;
const messageFrom = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback;

export function ProfilePage({ requester = false }: { requester?: boolean }) {
  const { user: authUser, permissions, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', avatarUrl: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmation: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(defaultNotificationPreferences);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current, preferences] = await Promise.all([apiRequest<User>('/users/me'), apiRequest<NotificationPreference>('/notification-preferences/me')]);
      setProfile(current);
      setForm({ name: current.name, phone: current.phone ?? '', avatarUrl: current.avatarUrl ?? '' });
      setNotificationPreferences(Object.fromEntries(Object.keys(defaultNotificationPreferences).map((key) => [key, preferences[key as keyof NotificationPreferenceForm]])) as unknown as NotificationPreferenceForm);
    } catch (reason) {
      setProfileMessage({ type: 'error', text: messageFrom(reason, 'Não foi possível carregar seu perfil.') });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const modules = useMemo(() => {
    if (authUser?.role === 'REQUESTER') return ['REQUESTER_PORTAL'] as PermissionModule[];
    if (authUser?.role === 'OWNER') return allAdminModules;
    return permissions.filter((permission) => permission.canView).map((permission) => permission.module);
  }, [authUser?.role, permissions]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSaving(true); setProfileMessage(null);
    try {
      const updated = await apiRequest<User>('/users/me', { method: 'PATCH', body: { name: form.name, phone: form.phone || null, avatarUrl: form.avatarUrl || null } });
      setProfile(updated); setForm({ name: updated.name, phone: updated.phone ?? '', avatarUrl: updated.avatarUrl ?? '' });
      await refreshUser();
      setProfileMessage({ type: 'success', text: 'Seus dados foram atualizados com sucesso.' });
    } catch (reason) { setProfileMessage({ type: 'error', text: messageFrom(reason, 'Não foi possível salvar suas alterações.') }); }
    finally { setSaving(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setPasswordMessage(null);
    if (password.newPassword !== password.confirmation) { setPasswordMessage({ type: 'error', text: 'A confirmação da nova senha não corresponde.' }); return; }
    setChangingPassword(true);
    try {
      await apiRequest('/auth/change-password', { method: 'POST', body: { currentPassword: password.currentPassword, newPassword: password.newPassword } });
      setPassword({ currentPassword: '', newPassword: '', confirmation: '' });
      setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso.' });
    } catch (reason) { setPasswordMessage({ type: 'error', text: messageFrom(reason, 'Não foi possível alterar sua senha.') }); }
    finally { setChangingPassword(false); }
  }

  async function saveNotificationPreferences(event: FormEvent) {
    event.preventDefault(); setSavingNotifications(true); setNotificationMessage(null);
    try {
      await apiRequest('/notification-preferences/me', { method: 'PATCH', body: notificationPreferences });
      setNotificationMessage({ type: 'success', text: 'Preferências de notificação salvas com sucesso.' });
    } catch (reason) { setNotificationMessage({ type: 'error', text: messageFrom(reason, 'Não foi possível salvar suas preferências.') }); }
    finally { setSavingNotifications(false); }
  }

  const notificationToggle = (field: keyof NotificationPreferenceForm, title: string, description: string, disabled = false) => <label className={`settings-toggle ${disabled ? 'disabled' : ''}`}>
    <span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" checked={notificationPreferences[field]} disabled={disabled} onChange={(event) => setNotificationPreferences((current) => ({ ...current, [field]: event.target.checked }))} /><i aria-hidden="true" />
  </label>;

  if (loading) return <LoadingState />;
  if (!profile) return <div className="alert error" role="alert">{profileMessage?.text ?? 'Perfil não encontrado.'}</div>;
  const initials = profile.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return <div className={`profile-page ${requester ? 'requester-profile-page' : ''}`}>
    <header className={requester ? 'requester-heading' : 'page-heading'}><div><p className="eyebrow">Minha conta</p><h1>Meu Perfil</h1><p>Consulte seus dados, preferências e segurança de acesso ao Orbyto.</p></div></header>
    <section className="profile-summary">
      {profile.avatarUrl ? <img className="profile-avatar" src={profile.avatarUrl} alt={`Avatar de ${profile.name}`} /> : <span className="profile-avatar fallback">{initials}</span>}
      <div><h2>{profile.name}</h2><p>{profile.email}</p><div className="badges"><span className="badge status">{labels[profile.role]}</span><span className={`badge user-${profile.status.toLowerCase()}`}>{labels[profile.status]}</span></div></div>
    </section>
    <div className="profile-grid">
      <section className="profile-card"><header><div><p className="eyebrow">Dados pessoais</p><h2>Informações básicas</h2></div></header>
        {profileMessage && <div className={`alert ${profileMessage.type}`} role="status">{profileMessage.text}</div>}
        <form className="profile-form" onSubmit={saveProfile}>
          <label>Nome<input required minLength={2} maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>E-mail<input type="email" value={profile.email} disabled /><small>O e-mail não pode ser alterado pelo perfil.</small></label>
          <label>Telefone (opcional)<input maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>URL do avatar (opcional)<input type="url" maxLength={2048} placeholder="https://..." value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} /></label>
          <button className="button primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </form>
      </section>
      <section className="profile-card"><header><div><p className="eyebrow">Segurança</p><h2>Alterar senha</h2></div></header>
        {passwordMessage && <div className={`alert ${passwordMessage.type}`} role="status">{passwordMessage.text}</div>}
        <form className="profile-form" onSubmit={changePassword}>
          <label>Senha atual<input type="password" required maxLength={72} autoComplete="current-password" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} /></label>
          <label>Nova senha<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} /><small>Use letras, números e caractere especial.</small></label>
          <label>Confirmar nova senha<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password.confirmation} onChange={(event) => setPassword({ ...password, confirmation: event.target.value })} /></label>
          <button className="button primary" disabled={changingPassword}>{changingPassword ? 'Alterando...' : 'Alterar senha'}</button>
        </form>
      </section>
      <section className="profile-card profile-notifications"><header><div><p className="eyebrow">Comunicação</p><h2>Preferências de Notificação</h2><p>Escolha quais comunicações operacionais deseja receber. E-mails essenciais de segurança permanecem ativos.</p></div></header>
        {notificationMessage && <div className={`alert ${notificationMessage.type}`} role="status">{notificationMessage.text}</div>}
        <form className="notification-preferences-form" onSubmit={saveNotificationPreferences}>
          <div className="notification-preference-group"><h3>Geral</h3><div className="settings-toggles">{notificationToggle('internalNotificationsEnabled', 'Receber notificações internas', 'Avisos exibidos dentro do Orbyto.')}{notificationToggle('emailNotificationsEnabled', 'Receber notificações por e-mail', 'Controle geral para e-mails operacionais.')}</div></div>
          <div className="notification-preference-group"><h3>Ordens de Serviço</h3><div className="settings-toggles">{notificationToggle('serviceOrderUpdatesEmail', 'Atualizações de OS', 'Alterações e status de ordens de serviço.', !notificationPreferences.emailNotificationsEnabled)}{notificationToggle('serviceOrderCommentsEmail', 'Comentários em OS', 'Novos comentários em ordens de serviço.', !notificationPreferences.emailNotificationsEnabled)}{notificationToggle('serviceOrderAttachmentsEmail', 'Anexos em OS', 'Novos arquivos anexados em ordens de serviço.', !notificationPreferences.emailNotificationsEnabled)}</div></div>
          <div className="notification-preference-group"><h3>Projetos</h3><div className="settings-toggles">{notificationToggle('projectUpdatesEmail', 'Atualizações em projetos', 'Alterações nos projetos relacionados a você.', !notificationPreferences.emailNotificationsEnabled)}{notificationToggle('projectCommentsEmail', 'Comentários em projetos', 'Preparado para o envio de comentários por e-mail.', !notificationPreferences.emailNotificationsEnabled)}</div></div>
          <div className="notification-preference-group"><h3>Tarefas</h3><div className="settings-toggles">{notificationToggle('taskUpdatesEmail', 'Atualizações em tarefas', 'Atribuições, status e alterações de prazo.', !notificationPreferences.emailNotificationsEnabled)}{notificationToggle('taskCommentsEmail', 'Comentários em tarefas', 'Preparado para o envio de comentários por e-mail.', !notificationPreferences.emailNotificationsEnabled)}</div></div>
          <div className="notification-preference-group"><h3>Alertas</h3><div className="settings-toggles">{notificationToggle('deadlineAlertsEmail', 'Alertas de prazo', 'Itens próximos do prazo ou vencidos.', !notificationPreferences.emailNotificationsEnabled)}{notificationToggle('satisfactionAlertsEmail', 'Avaliação baixa de satisfação', 'Avaliações que exigem tratativa.', !notificationPreferences.emailNotificationsEnabled)}{notificationToggle('dailySummaryEmail', 'Resumo diário por e-mail', 'Preferência disponível para integração futura.', true)}</div></div>
          <button className="button primary" disabled={savingNotifications}>{savingNotifications ? 'Salvando...' : 'Salvar preferências'}</button>
        </form>
      </section>
      <section className="profile-card profile-permissions"><header><div><p className="eyebrow">Perfil e permissões</p><h2>Seu acesso ao Orbyto</h2></div></header>
        <dl className="profile-details"><div><dt>Perfil</dt><dd>{profile.role === 'REQUESTER' ? 'Solicitante' : labels[profile.role]}</dd></div><div><dt>Status</dt><dd>{labels[profile.status]}</dd></div><div><dt>Último acesso</dt><dd>{formatDateTime(profile.lastLoginAt)}</dd></div><div><dt>Conta criada em</dt><dd>{formatDateTime(profile.createdAt, 'Não informado')}</dd></div></dl>
        <div className="profile-modules"><strong>{requester ? 'Acesso disponível' : 'Módulos disponíveis'}</strong><div>{modules.length ? modules.map((module) => <span key={module}>{moduleLabels[module]}</span>) : <p>Nenhum módulo administrativo está liberado. Seu perfil continua disponível.</p>}</div></div>
      </section>
    </div>
  </div>;
}

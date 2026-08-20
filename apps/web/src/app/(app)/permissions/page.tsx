'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/forms';
import { ErrorState, LoadingState } from '@/components/ui/page-state';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import type { RolePermission, UserRole } from '@/types/auth';

type MatrixRow = { role: UserRole; permissions: RolePermission[] };
type PermissionField = keyof Pick<RolePermission, 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canManage'>;
const moduleLabels: Record<RolePermission['module'], string> = { DASHBOARD: 'Dashboard', SERVICE_ORDERS: 'Ordens de Serviço', PROJECTS: 'Projetos', TASKS: 'Tarefas', KANBAN: 'Kanban', DAILY_LOGS: 'Registros Diários', SCHEDULE: 'Cronograma', USERS: 'Usuários', REQUESTER_PORTAL: 'Portal do Solicitante', SETTINGS: 'Configurações', LOOKUPS: 'Cadastros Auxiliares', SATISFACTION: 'Satisfação' };
const actions: readonly [PermissionField, string][] = [['canView', 'Ver'], ['canCreate', 'Criar'], ['canEdit', 'Editar'], ['canDelete', 'Excluir'], ['canManage', 'Gerenciar']];

export default function PermissionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MatrixRow[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [saving, setSaving] = useState<UserRole | null>(null); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setRows(await apiRequest<MatrixRow[]>('/permissions')); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar as permissões.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const locked = (role: UserRole) => role === 'OWNER' || role === 'REQUESTER' || (user?.role === 'ADMIN' && role === 'ADMIN');
  const toggle = (role: UserRole, module: RolePermission['module'], field: PermissionField) => setRows((current) => current.map((row) => row.role !== role ? row : { ...row, permissions: row.permissions.map((permission) => permission.module === module ? { ...permission, [field]: !permission[field] } : permission) }));
  const save = async (row: MatrixRow) => { setSaving(row.role); setError(''); try { const permissions = await apiRequest<RolePermission[]>(`/permissions/roles/${row.role}`, { method: 'PATCH', body: { permissions: row.permissions } }); setRows((current) => current.map((item) => item.role === row.role ? { ...item, permissions } : item)); setNotice(`Permissões de ${row.role} salvas com sucesso.`); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar.'); } finally { setSaving(null); } };

  return <><PageHeader title="Matriz de permissões" text="Ver permite acessar e consultar dados. Criar cadastra, Editar altera, Excluir remove e Gerenciar fica reservado a ações administrativas avançadas." />{notice && <div className="alert success">{notice}</div>}{error && <ErrorState message={error} retry={load} />}{loading ? <LoadingState /> : <div className="permission-list">{rows.map((row) => <section className="permission-card" key={row.role}><div className="permission-card-head"><div><h2>{row.role}</h2>{locked(row.role) && <small>Perfil protegido por regras de segurança.</small>}</div><button className="button primary small" disabled={locked(row.role) || saving === row.role} onClick={() => void save(row)}>{saving === row.role ? 'Salvando...' : 'Salvar perfil'}</button></div><div className="permission-table-wrap"><table className="permission-table"><thead><tr><th>Módulo</th>{actions.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead><tbody>{row.permissions.map((permission) => <tr key={permission.module}><td>{moduleLabels[permission.module]}</td>{actions.map(([field, label]) => <td key={field}><input aria-label={`${label} ${moduleLabels[permission.module]} para ${row.role}`} type="checkbox" checked={permission[field]} disabled={locked(row.role)} onChange={() => toggle(row.role, permission.module, field)} /></td>)}</tr>)}</tbody></table></div></section>)}</div>}</>;
}

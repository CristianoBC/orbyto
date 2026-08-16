export function LoadingState() { return <div className="state-card"><span className="spinner" />Carregando informações...</div>; }
export function EmptyState({ text }: { text: string }) { return <div className="state-card empty"><span>□</span><strong>Nenhum item por aqui</strong><p>{text}</p></div>; }
export function ErrorState({ message, retry }: { message: string; retry?(): void }) { return <div className="alert error">{message}{retry && <button onClick={retry}>Tentar novamente</button>}</div>; }

export const labels: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica', OPEN: 'Aberta', IN_REVIEW: 'Em análise',
  IN_PROGRESS: 'Em andamento', WAITING_REQUESTER: 'Aguardando solicitante', COMPLETED: 'Concluída', CANCELED: 'Cancelada',
  PLANNED: 'Planejado', PAUSED: 'Pausado', TODO: 'A fazer', DOING: 'Em execução', DONE: 'Concluída',
  OWNER: 'Proprietário', ADMIN: 'Administrador', MANAGER: 'Gestor', MEMBER: 'Membro', REQUESTER: 'Solicitante', VIEWER: 'Visualizador',
  ACTIVE: 'Ativo', INACTIVE: 'Inativo', PENDING: 'Pendente', BLOCKED: 'Bloqueado',
};
export const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Sem prazo';

import { formatDate } from '@/components/ui/page-state';
import type { DailyLog } from '@/types/daily-log';

const statusLabels = { COMPLETED: 'Concluído', IN_PROGRESS: 'Em andamento', PENDING: 'Pendente', WAITING_RETURN: 'Aguardando retorno' } as const;

export function DailyLogList({ items, onEdit, onComplete, onReopen, onDelete, compact = false }: { items: DailyLog[]; onEdit?: (item: DailyLog) => void; onComplete?: (item: DailyLog) => void; onReopen?: (item: DailyLog) => void; onDelete?: (item: DailyLog) => void; compact?: boolean }) {
  return <div className={compact ? 'daily-log-list compact' : 'daily-log-list'}>{items.map((item) => (
    <article className="daily-log-card" key={item.id}>
      <div className="daily-log-date"><strong>{new Date(item.logDate).toLocaleDateString('pt-BR', { day: '2-digit' })}</strong><span>{new Date(item.logDate).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span></div>
      <div className="daily-log-copy">
        <div className="daily-log-title"><h3>{item.title}</h3><span className={`badge daily-log-status-${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span>{item.workedHours != null && <span className="badge status">{formatHours(item.workedHours)}</span>}</div>
        <p>{item.content || 'Sem detalhes adicionais.'}</p>
        <small>{item.project?.title ? `Projeto: ${item.project.title} · ` : ''}{formatDate(item.logDate)}{item.author?.name ? ` · ${item.author.name}` : ''}</small>
      </div>
      {(onEdit || onComplete || onReopen || onDelete) && <div className="daily-log-actions">
        {onEdit && <button className="button ghost daily-log-edit" onClick={() => onEdit(item)}>Editar</button>}
        {item.status === 'COMPLETED' ? onReopen && <button className="button ghost daily-log-edit" onClick={() => onReopen(item)}>Reabrir</button> : onComplete && <button className="button ghost daily-log-edit" onClick={() => onComplete(item)}>Concluir</button>}
        {onDelete && <button className="button danger-ghost daily-log-edit" onClick={() => onDelete(item)}>Excluir</button>}
      </div>}
    </article>
  ))}</div>;
}

function formatHours(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} h`;
}

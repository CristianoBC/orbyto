import { formatDate } from '@/components/ui/page-state';
import type { DailyLog } from '@/types/daily-log';

export function DailyLogList({ items, onEdit, compact = false }: { items: DailyLog[]; onEdit?: (item: DailyLog) => void; compact?: boolean }) {
  return <div className={compact ? 'daily-log-list compact' : 'daily-log-list'}>{items.map((item) => (
    <article className="daily-log-card" key={item.id}>
      <div className="daily-log-date"><strong>{new Date(item.logDate).toLocaleDateString('pt-BR', { day: '2-digit' })}</strong><span>{new Date(item.logDate).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span></div>
      <div className="daily-log-copy">
        <div className="daily-log-title"><h3>{item.title}</h3>{item.workedHours != null && <span className="badge status">{formatHours(item.workedHours)}</span>}</div>
        <p>{item.content || 'Sem detalhes adicionais.'}</p>
        <small>{item.project?.title ? `Projeto: ${item.project.title} · ` : ''}{formatDate(item.logDate)}{item.author?.name ? ` · ${item.author.name}` : ''}</small>
      </div>
      {onEdit && <button className="button ghost daily-log-edit" onClick={() => onEdit(item)}>Editar</button>}
    </article>
  ))}</div>;
}

function formatHours(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} h`;
}

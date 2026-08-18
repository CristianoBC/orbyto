export type DeadlineStatus = 'overdue' | 'dueSoon' | 'onTrack' | 'noDueDate';

export interface DeadlineInfo {
  status: DeadlineStatus;
  label: 'Vencida' | 'Próxima do prazo' | 'No prazo' | 'Sem prazo';
  daysRemaining: number | null;
  daysOverdue: number | null;
}

const labels: Record<DeadlineStatus, DeadlineInfo['label']> = {
  overdue: 'Vencida', dueSoon: 'Próxima do prazo', onTrack: 'No prazo', noDueDate: 'Sem prazo',
};
const dayValue = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());

export function deadlineInfo(dueDate: string | null | undefined, status: string, closed: readonly string[], dueSoonDays: number): DeadlineInfo {
  if (!dueDate) return { status: 'noDueDate', label: labels.noDueDate, daysRemaining: null, daysOverdue: null };
  const days = Math.round((dayValue(new Date(dueDate)) - dayValue(new Date())) / 86_400_000);
  const result: DeadlineStatus = !closed.includes(status) && days < 0 ? 'overdue' : !closed.includes(status) && days <= dueSoonDays ? 'dueSoon' : 'onTrack';
  return { status: result, label: labels[result], daysRemaining: days >= 0 ? days : null, daysOverdue: days < 0 ? Math.abs(days) : null };
}

export const serviceOrderDeadline = (item: { dueDate?: string | null; status: string }) => deadlineInfo(item.dueDate, item.status, ['COMPLETED', 'CANCELED'], 3);
export const projectDeadline = (item: { dueDate?: string | null; status: string; finishedAt?: string | null }) => item.finishedAt ? deadlineInfo(item.dueDate, 'COMPLETED', ['COMPLETED'], 7) : deadlineInfo(item.dueDate, item.status, ['COMPLETED', 'CANCELED'], 7);
export const taskDeadline = (item: { dueDate?: string | null; status: string }) => deadlineInfo(item.dueDate, item.status, ['DONE', 'CANCELED'], 3);

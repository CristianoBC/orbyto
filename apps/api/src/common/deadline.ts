export type DeadlineStatus = 'overdue' | 'dueSoon' | 'onTrack' | 'noDueDate';

const DAY_MS = 86_400_000;

function dayValue(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getDeadlineInfo(
  dueDate: Date | null | undefined,
  status: string,
  closedStatuses: readonly string[],
  dueSoonDays: number,
  now = new Date(),
) {
  if (!dueDate) return { deadlineStatus: 'noDueDate' as DeadlineStatus, daysRemaining: null, daysOverdue: null };

  const days = Math.round((dayValue(dueDate) - dayValue(now)) / DAY_MS);
  const closed = closedStatuses.includes(status);
  const deadlineStatus: DeadlineStatus = !closed && days < 0
    ? 'overdue'
    : !closed && days <= dueSoonDays
      ? 'dueSoon'
      : 'onTrack';

  return {
    deadlineStatus,
    daysRemaining: days >= 0 ? days : null,
    daysOverdue: days < 0 ? Math.abs(days) : null,
  };
}

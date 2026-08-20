export interface ReportPerson { id: string; name: string }
export interface ReportProjectRef { id: string; title: string }
export interface DeadlineReportFields { deadlineStatus: 'overdue' | 'dueSoon' | 'onTrack' | 'noDueDate'; daysRemaining: number | null; daysOverdue: number | null }
export interface ServiceOrderReportRow extends DeadlineReportFields { id: string; title: string; status: string; priority: string | null; category: string | null; system: string | null; unit: string | null; dueDate: string | null; createdAt: string; updatedAt: string; finishedAt: string | null; requester: ReportPerson; responsible: ReportPerson | null }
export interface ProjectReportRow extends DeadlineReportFields { id: string; title: string; status: string; priority: string; area: string | null; unit: string | null; type: string | null; completionPercentage: number; startDate: string | null; dueDate: string | null; finishedAt: string | null; createdAt: string; owner: ReportPerson }
export interface TaskReportRow extends DeadlineReportFields { id: string; title: string; status: string; priority: string; dueDate: string | null; finishedAt: string | null; createdAt: string; updatedAt: string; project: ReportProjectRef; assignee: ReportPerson | null }
export interface DailyLogReportRow { id: string; date: string; title: string; description: string | null; status: string; createdAt: string; workedHours: number | null; user: ReportPerson; project: ReportProjectRef | null; task: null }
export interface ReportGroupItem { label: string; total: number }
export interface ReportResponse<T> { summary: Record<string, number | null>; groupedData: Record<string, ReportGroupItem[]>; rows: T[]; pagination: { page: number; limit: number; total: number; pages: number } }

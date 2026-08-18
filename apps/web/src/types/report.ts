export interface ReportPerson { id: string; name: string }
export interface ReportProjectRef { id: string; title: string }

export interface ServiceOrderReportRow {
  id: string; title: string; status: string; priority: string | null;
  category: string | null; system: string | null; unit: string | null;
  dueDate: string | null; createdAt: string; updatedAt: string; finishedAt: string | null;
  requester: ReportPerson; responsible: ReportPerson | null;
}
export interface ProjectReportRow {
  id: string; title: string; status: string; priority: string; area: string | null;
  unit: string | null; startDate: string | null; dueDate: string | null;
  finishedAt: string | null; createdAt: string; owner: ReportPerson;
}
export interface TaskReportRow {
  id: string; title: string; status: string; priority: string; dueDate: string | null;
  createdAt: string; updatedAt: string; project: ReportProjectRef; assignee: ReportPerson | null;
}
export interface DailyLogReportRow {
  id: string; date: string; title: string; description: string | null; status: string;
  createdAt: string; workedHours: number | null; user: ReportPerson;
  project: ReportProjectRef | null; task: null;
}

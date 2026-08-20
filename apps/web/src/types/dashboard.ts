export type DashboardModuleKey = 'serviceOrders' | 'projects' | 'tasks' | 'dailyLogs';

export interface DashboardItem {
  id: string;
  module: DashboardModuleKey;
  title: string;
  status?: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  context?: string | null;
  deadline?: 'overdue' | 'dueSoon';
}

export interface DashboardOverview {
  visibility: Record<DashboardModuleKey, boolean>;
  metrics: {
    serviceOrders: { open: number; overdue: number; dueSoon: number } | null;
    projects: { active: number; overdue: number } | null;
    tasks: { pending: number; inProgress: number; overdue: number } | null;
    dailyLogs: { recent: number } | null;
  };
  attention: DashboardItem[];
  upcoming: DashboardItem[];
  movements: DashboardItem[];
  statusSummary: {
    serviceOrders: Record<string, number> | null;
    projects: Record<string, number> | null;
    tasks: Record<string, number> | null;
  };
  generatedAt: string;
}

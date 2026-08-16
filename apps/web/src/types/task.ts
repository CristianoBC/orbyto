import type { Priority } from './service-order';

export type TaskStatus = 'PLANNED' | 'TODO' | 'DOING' | 'DONE' | 'CANCELED';
export interface Task {
  id: string;
  title: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string | null;
  project: { id: string; title: string };
}

export interface DailyLog {
  id: string;
  title: string;
  content?: string | null;
  logDate: string;
  project?: { id: string; title: string } | null;
  taskId?: string | null;
}

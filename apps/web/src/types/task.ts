import type { Priority } from './service-order';

export type TaskStatus = 'PLANNED' | 'TODO' | 'DOING' | 'DONE' | 'CANCELED';
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string | null;
  project: { id: string; title: string };
  assignee?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTask {
  projectId: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  assigneeId?: string;
  dueDate?: string;
}

export type UpdateTask = Partial<Omit<CreateTask, 'projectId'>>;

export interface DailyLog {
  id: string;
  title: string;
  content?: string | null;
  logDate: string;
  project?: { id: string; title: string } | null;
  taskId?: string | null;
}

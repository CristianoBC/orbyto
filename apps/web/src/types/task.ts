import type { Priority } from './service-order';

export type TaskStatus = 'PLANNED' | 'TODO' | 'DOING' | 'DONE' | 'CANCELED';
export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string | null;
  completedAt?: string | null;
  project: { id: string; title: string; ownerId?: string; status?: string };
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

import type { Priority } from './service-order';

export type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELED';
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  department?: string | null;
  unit?: string | null;
  priority: Priority;
  status: ProjectStatus;
  owner?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
  tags?: string[];
  taskCounts?: { tasks: number; completedTasks: number };
  createdAt: string;
  updatedAt?: string;
}

export type CreateProject = Pick<Project, 'name' | 'description' | 'department' | 'unit' | 'priority' | 'status'>;

export type UpdateProject = Pick<Project, 'name' | 'description' | 'department' | 'unit' | 'priority' | 'status' | 'tags'> & {
  ownerId?: string;
};

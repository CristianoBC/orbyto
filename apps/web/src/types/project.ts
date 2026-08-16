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
  createdAt: string;
}

export type CreateProject = Pick<Project, 'name' | 'description' | 'department' | 'unit' | 'priority' | 'status'>;

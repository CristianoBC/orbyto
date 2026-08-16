import type { Project } from './project';

export interface DailyLog {
  id: string;
  title: string;
  content?: string | null;
  type?: string | null;
  logDate: string;
  workedHours?: number | null;
  authorId: string;
  author?: { id: string; name: string; email: string } | null;
  project?: Pick<Project, 'id'> & { title: string } | null;
  taskId: null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyLogPayload {
  projectId?: string;
  title: string;
  content: string;
  logDate: string;
  workedHours?: number;
}

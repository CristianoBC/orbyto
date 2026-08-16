export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ServiceOrderStatus = 'OPEN' | 'IN_REVIEW' | 'IN_PROGRESS' | 'WAITING_REQUESTER' | 'COMPLETED' | 'CANCELED';

export interface ServiceOrder {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  system?: string | null;
  unit?: string | null;
  channel?: string | null;
  origin?: string | null;
  tags?: string | null;
  priority?: Priority | null;
  status: ServiceOrderStatus;
  dueDate?: string | null;
  finishedAt?: string | null;
  observation?: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: ServiceOrderUser | null;
  responsible?: ServiceOrderUser | null;
}

export interface ServiceOrderUser { id: string; name: string; email: string; }
export interface ServiceOrderComment {
  id: string; text: string; createdAt: string;
  author: ServiceOrderUser & { role?: string; avatarUrl?: string | null };
}
export interface ServiceOrderAttachment {
  id: string; originalName?: string | null; fileName: string; mimeType: string; size: number; createdAt: string;
  uploadedBy: ServiceOrderUser & { role?: string; avatarUrl?: string | null };
}

export type CreateServiceOrder = Pick<ServiceOrder, 'title' | 'description' | 'category' | 'system' | 'unit' | 'priority'>;
export type UpdateServiceOrder = Partial<Pick<ServiceOrder,
  'title' | 'description' | 'category' | 'system' | 'unit' | 'channel' | 'origin' | 'priority' | 'status' | 'observation'
>> & { responsibleId?: string };

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ServiceOrderStatus = 'OPEN' | 'IN_REVIEW' | 'IN_PROGRESS' | 'WAITING_REQUESTER' | 'COMPLETED' | 'CANCELED';

export interface ServiceOrder {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  system?: string | null;
  unit?: string | null;
  priority?: Priority | null;
  status: ServiceOrderStatus;
  createdAt: string;
}

export type CreateServiceOrder = Pick<ServiceOrder, 'title' | 'description' | 'category' | 'system' | 'unit' | 'priority'>;

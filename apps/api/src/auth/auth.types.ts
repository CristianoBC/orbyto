import { UserRole, UserStatus } from '@prisma/client';

export type AuthUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};
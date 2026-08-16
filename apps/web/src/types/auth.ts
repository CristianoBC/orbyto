export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'REQUESTER' | 'VIEWER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  tenant: { id: string; name: string; slug: string; status: string; plan: string };
}

export interface User extends AuthUser {
  phone?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}
